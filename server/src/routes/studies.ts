import { Router } from 'express';
import type { StudyId, PaginatedResponse, GeneListResponse, EssentialityData, CircRNAAnnotation } from '../types.js';
import axios from 'axios';
import dotenv from 'dotenv'; dotenv.config();

export const studiesRouter = Router();

const DATA_DIR = "https://storage.googleapis.com/funcirc-db-data/";

// JSON file loader with error handling
async function loadJSON<T>(filepath: string): Promise<T | null> {
    const fullPath = DATA_DIR + filepath;
    console.log(fullPath);
    try {
        const res = await axios.get(fullPath);
        return res.data;
    } catch (err) {
        console.error(`Error loading ${filepath}:`, err);
        return null;
    }
}

// In-memory cache (simple LRU could be added)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data as T;
    }
    cache.delete(key);
    return null;
}

function setCache(key: string, data: unknown): void {
    cache.set(key, { data, timestamp: Date.now() });
}

async function preloadStudies(): Promise<void> {
    const studies: StudyId[] = ['her-et-al', 'liu-et-al', 'li-et-al', 'chen-et-al'];

    await Promise.allSettled(
        studies.map(async (studyId) => {
            // Genes
            const genes = await loadJSON<{ genes: string[] }>(`${studyId}/genes.json`);
            if (genes) setCache(`genes:${studyId}::`, genes);

            // Annotations
            const ann = await loadJSON<CircRNAAnnotation[]>(`${studyId}/annotations.json`);
            if (ann) setCache(`annotations:${studyId}::`, { data: ann });

            // Study-specific essentiality backing files
            if (studyId === 'her-et-al') {
                const screen = await loadJSON<Record<string, unknown>[]>(`${studyId}/screen_data.json`);
                if (screen) setCache(`her:screen_data`, screen);

                const herAnn = await loadJSON<Record<string, unknown>[]>(`${studyId}/annotations.json`);
                if (herAnn) setCache(`her:annotations`, herAnn);
            }

            if (studyId === 'chen-et-al') {
                const circ = await loadJSON<Record<string, unknown>[]>(`${studyId}/circ_data.json`);
                if (circ) setCache(`chen:circ_data`, circ);

                const lin = await loadJSON<Record<string, unknown>[]>(`${studyId}/linear_data.json`);
                if (lin) setCache(`chen:linear_data`, lin);

                const chenAnn = await loadJSON<Record<string, unknown>[]>(`${studyId}/annotations.json`);
                if (chenAnn) setCache(`chen:annotations`, chenAnn);
            }
        })
    );
    console.log('Cache preload complete!');
}
console.log(process.env.DEPLOYED)
if (process.env.DEPLOYED) {
	void preloadStudies().catch(err => console.error('preloading studies has failed, review logs:', err));
}

// GET /api/studies - List all available studies
studiesRouter.get('/', (_, res) => {
    const studies = [
        { id: 'her-et-al', name: 'Her et al.', description: 'shRNA genome-wide circRNA screen (7 cancer cell lines)' },
        { id: 'liu-et-al', name: 'Liu et al.', description: 'shRNA-based circRNA screen (18 cell lines, 4 tissue types)' },
        { id: 'li-et-al', name: 'Li et al.', description: 'CRISPR-RfxCas13d circRNA screen (Colon, Pancreas, Brain, Skin)' },
        { id: 'chen-et-al', name: 'Chen et al.', description: 'shRNA circRNA screen in prostate cancer (LNCaP, V16A, 22Rv1, PC-3)' },
    ];
    res.json(studies);
});

// GET /api/studies/:id/genes - Get gene list for a study (for dropdown)
studiesRouter.get('/:id/genes', async (req, res) => {
    const studyId = req.params.id as StudyId;
    const { cellLine, tissueType } = req.query;
    const cacheKey = `genes:${studyId}:${cellLine || ''}:${tissueType || ''}`;

    const cached = getCached<GeneListResponse>(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    // Try loading from JSON file
    let genePath = `${studyId}/genes.json`;
    if (cellLine) {
        genePath = `${studyId}/${String(cellLine).toLowerCase()}/genes.json`;
    } else if (tissueType) {
        genePath = `${studyId}/${String(tissueType).toLowerCase()}/genes.json`;
    }

    const jsonData = await loadJSON<{ genes: string[] }>(genePath);
    if (jsonData) {
        setCache(cacheKey, jsonData);
        return res.json(jsonData);
    }

    // Fallback to mock data if files not yet generated
    const mockGenes = ['HIPK3', 'CDR1as', 'SMARCA5', 'ZKSCAN1', 'FAM120A'];
    const response: GeneListResponse = { genes: mockGenes };

    setCache(cacheKey, response);
    res.json(response);
});

// GET /api/studies/:id/annotations - Get ALL circRNA annotations for a study (for table display)
studiesRouter.get('/:id/annotations', async (req, res) => {
    const studyId = req.params.id as StudyId;
    const { cellLine, tissueType, gene } = req.query;
    const cacheKey = `annotations:${studyId}:${cellLine || ''}:${tissueType || ''}`;

    const cached = getCached<{ data: CircRNAAnnotation[] }>(cacheKey);
    if (cached) {
        let data = cached.data;
        // Filter by gene if provided
        if (gene) {
            data = data.filter(row => row.gene === gene);
        }
        return res.json({ data });
    }

    // Try loading from JSON file - check both annotations.json and data.json
    let annotationPath = `${studyId}/annotations.json`;
    if (cellLine) {
        // Liu et al. uses data.json per cell line
        annotationPath = `${studyId}/${String(cellLine).toLowerCase()}/data.json`;
    } else if (tissueType) {
        // Li et al. uses data.json per tissue type
        annotationPath = `${studyId}/${String(tissueType).toLowerCase()}/data.json`;
    }

    let jsonData = await loadJSON<CircRNAAnnotation[]>(annotationPath);

    // Fallback: try annotations.json if data.json doesn't exist
    if (!jsonData && (cellLine || tissueType)) {
        const fallbackPath = cellLine
            ? `${studyId}/${String(cellLine).toLowerCase()}/annotations.json`
            : `${studyId}/${String(tissueType).toLowerCase()}/annotations.json`;
        jsonData = await loadJSON<CircRNAAnnotation[]>(fallbackPath);
    }

    if (jsonData) {
        // Filter out invalid entries (e.g., ZBTB11 with ENT=ENST00000312938.4 has invalid lengthE)
        if (studyId === 'her-et-al') {
            jsonData = jsonData.filter(row =>
                !(row.gene === 'ZBTB11' && row.ENT === 'ENST00000312938.4')
            );
        }

        setCache(cacheKey, { data: jsonData });

        let data = jsonData;
        // Filter by gene if provided
        if (gene) {
            data = jsonData.filter(row => row.gene === gene);
        }
        return res.json({ data });
    }

    // Fallback mock data
    const mockData: CircRNAAnnotation[] = [
        { X: 'hsa_circ_0001234', ENT: 'ENSG00000123456', gene: 'HIPK3', flanking: 'intron', numE: 3, lengthE: 456, index: '1,2,3', name: 'circHIPK3', start: 12345678, end: 12346789, pos: 'chr11-12345678-12346789', chr: 'chr11', strand: '+' },
    ];

    const response = { data: mockData };
    setCache(cacheKey, response);
    res.json(response);
});

// GET /api/studies/:id/circrnas - Get circRNA annotations for a gene
studiesRouter.get('/:id/circrnas', async (req, res) => {
    const studyId = req.params.id as StudyId;
    const { gene, page = '1', pageSize = '100' } = req.query;

    if (!gene) {
        return res.status(400).json({ error: 'gene query parameter is required' });
    }

    const cacheKey = `circrnas:${studyId}:${gene}:${page}:${pageSize}`;
    const cached = getCached<PaginatedResponse<CircRNAAnnotation>>(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    // TODO: Load from pre-processed JSON files
    const mockData: CircRNAAnnotation[] = [
        {
            X: 'hsa_circ_0001234',
            ENT: 'ENSG00000123456',
            gene: gene as string,
            flanking: 'intron',
            numE: 3,
            lengthE: 456,
            index: '1,2,3',
            name: 'circHIPK3',
            start: 12345678,
            end: 12346789,
            pos: 'chr11-12345678-12346789',
            chr: 'chr11',
            strand: '+',
        },
    ];

    const response: PaginatedResponse<CircRNAAnnotation> = {
        data: mockData,
        total: mockData.length,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        hasMore: false,
    };

    setCache(cacheKey, response);
    res.json(response);
});

// GET /api/studies/:id/essentiality - Get essentiality data for dotmap
studiesRouter.get('/:id/essentiality', async (req, res) => {
    const studyId = req.params.id as StudyId;
    const { circRNAId, timepoint, cellLine, tissueType } = req.query;

    if (!circRNAId) {
        return res.status(400).json({ error: 'circRNAId query parameter is required' });
    }

    const cacheKey = `essentiality:${studyId}:${circRNAId}:${timepoint}:${cellLine}:${tissueType}`;
    const cached = getCached<EssentialityData>(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    try {
        // Chen et al. uses separate circ_data.json and linear_data.json files
        if (studyId === 'chen-et-al') {
			let circData = null;
			let linearData = null;
			let annotations = null;

			// Ensures we don't preload data locally to to avoid egress costs
			if (process.env.DEPLOYED) {
				circData =
					getCached<Record<string, unknown>[]>(`chen:circ_data`) ??
					await loadJSON<Record<string, unknown>[]>(`${studyId}/circ_data.json`);

				linearData =
					getCached<Record<string, unknown>[]>(`chen:linear_data`) ??
					await loadJSON<Record<string, unknown>[]>(`${studyId}/linear_data.json`);

				annotations =
					getCached<Record<string, unknown>[]>(`chen:annotations`) ??
					await loadJSON<Record<string, unknown>[]>(`${studyId}/annotations.json`);
			} else {
				circData = await loadJSON<Record<string, unknown>[]>(`${studyId}/circ_data.json`);
				linearData = await loadJSON<Record<string, unknown>[]>(`${studyId}/linear_data.json`);
				annotations = await loadJSON<Record<string, unknown>[]>(`${studyId}/annotations.json`);			
			}

            if (!circData) {
                return res.json({ values: [], pvalues: [], rowLabels: [], colLabels: [] });
            }

            // Find the circRNA in annotations using screenID (the ID that links to circ_data)
            const circInfo = annotations?.find(a =>
                String(a.screenID) === circRNAId ||
                String(a.X) === circRNAId ||
                String(a.id) === circRNAId
            );

            if (!circInfo) {
                return res.json({ values: [], pvalues: [], rowLabels: [], colLabels: [] });
            }

            const gene = String(circInfo.gene || '');
            const index = String(circInfo.index || '');
            const screenID = String(circInfo.screenID || circRNAId);
            const tp = String(timepoint || 'T8vsT0');

            // Get unique cell lines from the data (PC3, 22Rv1, V16A, LnCaP)
            const cellLines = [...new Set(circData
                .filter(row => String(row.id) === screenID && String(row.timepoint) === tp)
                .map(row => String(row.cell_line))
            )].sort();

            // If no data for this screenID, try matching by gene
            let circMatches = circData.filter(row =>
                String(row.id) === screenID && String(row.timepoint) === tp
            );

            if (circMatches.length === 0) {
                // Fallback: match by gene name
                circMatches = circData.filter(row =>
                    String(row.gene) === gene && String(row.timepoint) === tp
                );
                if (circMatches.length > 0) {
                    // Get unique cell lines from matched data
                    const matchedCellLines = [...new Set(circMatches.map(row => String(row.cell_line)))].sort();
                    cellLines.length = 0;
                    cellLines.push(...matchedCellLines);
                }
            }

            // Get matching linear data (by gene and timepoint)
            const linearMatches = (linearData || []).filter(row =>
                String(row.gene) === gene && String(row.timepoint) === tp
            );

            // Create row labels (circRNA neg/pos and linear neg/pos)
            const indexStr = index.split(',').length <= 3
                ? index
                : `${Math.min(...index.split(',').map(Number))}-${Math.max(...index.split(',').map(Number))}`;

            const rowLabels = [
                `circ${gene}(${indexStr})_neg`,
                `circ${gene}(${indexStr})_pos`,
                `${gene}_neg`,
                `${gene}_pos`
            ];

            // Initialize matrices
            const values: number[][] = rowLabels.map(() => cellLines.map(() => 0));
            const pvalues: number[][] = rowLabels.map(() => cellLines.map(() => 1));

            // Fill circRNA data (rows 0 and 1)
            circMatches.forEach(row => {
                const cellLine = String(row.cell_line);
                const colIdx = cellLines.indexOf(cellLine);
                if (colIdx === -1) return;

                // neg values (row 0)
                values[0][colIdx] = Number(row['neg.lfc']) || 0;
                pvalues[0][colIdx] = Number(row['neg.p.value']) || 1;

                // pos values (row 1)
                values[1][colIdx] = Number(row['pos.lfc']) || 0;
                pvalues[1][colIdx] = Number(row['pos.p.value']) || 1;
            });

            // Fill linear data (rows 2 and 3)
            linearMatches.forEach(row => {
                const cellLine = String(row.cell_line);
                const colIdx = cellLines.indexOf(cellLine);
                if (colIdx === -1) return;

                // neg values (row 2)
                values[2][colIdx] = Number(row['neg.lfc']) || 0;
                pvalues[2][colIdx] = Number(row['neg.p.value']) || 1;

                // pos values (row 3)
                values[3][colIdx] = Number(row['pos.lfc']) || 0;
                pvalues[3][colIdx] = Number(row['pos.p.value']) || 1;
            });

            const response: EssentialityData = {
                values,
                pvalues,
                rowLabels,
                colLabels: cellLines,
            };

            setCache(cacheKey, response);
            return res.json(response);
        }

        // Her et al. uses screen_data.json format
        if (studyId === 'her-et-al') {

			let screenData = null;
			let annotations = null;
			// Ensures we don't preload data locally to to avoid egress costs
			if (process.env.DEPLOYED) {
				screenData =
					getCached<Record<string, unknown>[]>(`her:screen_data`) ??
					await loadJSON<Record<string, unknown>[]>(`${studyId}/screen_data.json`);
				annotations =
					getCached<Record<string, unknown>[]>(`her:annotations`) ??
					await loadJSON<Record<string, unknown>[]>(`${studyId}/annotations.json`);
			} else {
				screenData = await loadJSON<Record<string, unknown>[]>(`${studyId}/screen_data.json`);
            	annotations = await loadJSON<Record<string, unknown>[]>(`${studyId}/annotations.json`);
			}


            if (!screenData) {
                return res.json({ values: [], pvalues: [], rowLabels: [], colLabels: [] });
            }

            // Find the circRNA in annotations to get its info
            const circInfo = annotations?.find(a => String(a.X) === circRNAId || String(a.id) === circRNAId);
            const gene = circInfo?.gene || String(circRNAId).split('_')[0];
            const index = circInfo?.index || '';

            // Get unique samples (cell lines)
            const samples = [...new Set(screenData.map(row => String(row.sample)))];

            // Filter data for this circRNA (by id field which is sample_gene format)
            // The ID format is like "22RV1_ADSL" so we need to find entries ending with the gene name
            const geneStr = String(gene);
            const matchingRows = screenData.filter(row => {
                const rowId = String(row.id || '');
                return rowId.endsWith(`_${geneStr}`) || rowId === circRNAId;
            });

            // Build the dotmap matrix
            // Rows: circRNA isoforms with neg/pos suffixes
            // Cols: Cell lines/samples
            const tp = String(timepoint || 'T8vsT0');

            // Create row labels based on circRNA name (circ[GENE]([index])_neg, _pos) and gene name for linear
            const rowLabels = [
                `circ${geneStr}(${index})_neg`,
                `circ${geneStr}(${index})_pos`,
                `${geneStr}_neg`,
                `${geneStr}_pos`
            ];

            // Get values for each sample and type
            const values: number[][] = rowLabels.map(() => samples.map(() => 0));
            const pvalues: number[][] = rowLabels.map(() => samples.map(() => 1));

            matchingRows.forEach(row => {
                const sample = String(row.sample);
                const colIdx = samples.indexOf(sample);
                if (colIdx === -1) return;

                const groups = String(row.groups || '').toLowerCase();
                const isLinear = groups.includes('linear');

                // Determine row indices based on linear vs circ
                const negRowIdx = isLinear ? 2 : 0;
                const posRowIdx = isLinear ? 3 : 1;

                // Get neg values
                const negLfc = Number(row[`${tp}.gene_summary.neg.lfc`]) || 0;
                const negPval = Number(row[`${tp}.gene_summary.neg.p.value`]) || 1;
                values[negRowIdx][colIdx] = negLfc;
                pvalues[negRowIdx][colIdx] = negPval;

                // Get pos values
                const posLfc = Number(row[`${tp}.gene_summary.pos.lfc`]) || 0;
                const posPval = Number(row[`${tp}.gene_summary.pos.p.value`]) || 1;
                values[posRowIdx][colIdx] = posLfc;
                pvalues[posRowIdx][colIdx] = posPval;
            });

            const response: EssentialityData = {
                values,
                pvalues,
                rowLabels,
                colLabels: samples,
            };

            setCache(cacheKey, response);
            return res.json(response);
        }

        // Liu et al. - tissue-specific cell lines (shRNA dotmap), no neg/pos split, no linear (only circRNA)
        if (studyId === 'liu-et-al' && tissueType) {
            const tissueKey = String(tissueType).toLowerCase();
            const tissueData = await loadJSON<Record<string, unknown>[]>(`${studyId}/${tissueKey}/data.json`);

            if (!tissueData) {
                return res.json({ values: [], pvalues: [], rowLabels: [], colLabels: [] });
            }

            // Find the circRNA data - might match circRNA_ID or Gene field
            const circRNAIdStr = String(circRNAId);
            const matchingRow = tissueData.find(row =>
                String(row.circRNA_ID) === circRNAIdStr ||
                String(row.Gene) === circRNAIdStr ||
                String(row.X) === circRNAIdStr
            );

            if (!matchingRow) {
                return res.json({ values: [], pvalues: [], rowLabels: [], colLabels: [] });
            }

            // Get cell line columns from the data (everything that's not annotation fields)
            const annotationFields = ['circRNA_ID', 'Gene', 'X', 'ENT', 'gene', 'flanking', 'type', 'numE', 'lengthE', 'index', 'pos', 'name', 'strand', 'chr', 'start', 'end', 'id', 'ENS'];
            const cellLines = Object.keys(matchingRow).filter(key => !annotationFields.includes(key));

            const gene = matchingRow.gene || matchingRow.Gene?.toString().split('-')[0] || '';
            const index = matchingRow.index || '';

            // Build single row (circRNA only, no linear for Liu et al. shRNA)
            const rowLabel = `circ${gene}(${index})`;
            const values: number[][] = [cellLines.map(cl => Number(matchingRow[cl]) || 0)];
            // Liu et al. data doesn't have p-values in the direct format, set all to 0.5 (neutral)
            const pvalues: number[][] = [cellLines.map(() => 0.5)];

            const response: EssentialityData = {
                values,
                pvalues,
                rowLabels: [rowLabel],
                colLabels: cellLines,
            };

            setCache(cacheKey, response);
            return res.json(response);
        }

        // Fallback for other studies - return empty
        const emptyResponse: EssentialityData = {
            values: [],
            pvalues: [],
            rowLabels: [],
            colLabels: [],
        };
        res.json(emptyResponse);

    } catch (error) {
        console.error('Error loading essentiality data:', error);
        res.status(500).json({ error: 'Failed to load essentiality data' });
    }
});
