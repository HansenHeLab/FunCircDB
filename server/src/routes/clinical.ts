import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ClinicalDatasetId } from '../types.js';

export const clinicalRouter = Router();

// Data directory path - goes up from server/src/routes to /db_react/data
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../../data');

// JSON file loader with error handling
function loadJSON<T>(filepath: string): T | null {
    try {
        const fullPath = path.join(DATA_DIR, filepath);
        if (!fs.existsSync(fullPath)) return null;
        return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
        console.error(`Error loading ${filepath}:`, err);
        return null;
    }
}

// In-memory cache
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

// GET /api/clinical - List all clinical datasets
clinicalRouter.get('/', (_, res) => {
    const datasets = [
        { id: 'arul-et-al', name: 'Arul et al. (Vo et al.)', description: 'The Landscape of Circular RNA in Cancer' },
        { id: 'cpcg', name: 'CPCG (Fraser et al.)', description: 'Canadian Prostate Cancer Genome Network' },
        { id: 'breast-cohort', name: 'In-house Breast Cohort', description: 'circRNA in breast cancer subtypes' },
    ];
    res.json(datasets);
});

// GET /api/clinical/:id/genes - Get gene list for dropdown
clinicalRouter.get('/:id/genes', async (req, res) => {
    const datasetId = req.params.id as ClinicalDatasetId;
    const cacheKey = `clinical:genes:${datasetId}`;

    const cached = getCached<{ genes: string[] }>(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    // Load from pre-generated genes.json (created by convert_data.js)
    const genesPath = `clinical/${datasetId}-genes.json`;
    const genesData = loadJSON<{ genes: string[] }>(genesPath);
    if (genesData) {
        setCache(cacheKey, genesData);
        return res.json(genesData);
    }

    // Fallback if data hasn't been converted yet
    const mockGenes = ['HIPK3', 'CDR1as', 'SMARCA5'];
    const response = { genes: mockGenes };
    res.json(response);
});

// GET /api/clinical/:id/expression - Get expression data for a circRNA
clinicalRouter.get('/:id/expression', async (req, res) => {
    const datasetId = req.params.id as ClinicalDatasetId;
    const { circRNAId, gene } = req.query;

    if (!circRNAId && !gene) {
        return res.status(400).json({ error: 'circRNAId or gene query parameter is required' });
    }

    const queryGene = String(gene || circRNAId);

    // Check for "split" data first (optimized format)
    // Path: data/clinical/split/{datasetId}/{gene}.json
    const splitPath = `clinical/split/${datasetId}/${queryGene}.json`;
    const splitData = loadJSON<Record<string, unknown>[]>(splitPath);

    let filteredData: Record<string, unknown>[] = [];

    if (splitData) {
        // Fast path: Data already filtered by gene
        filteredData = splitData;
    } else {
        // Slow fallback: Try loading full dataset (Only works for small files, will fail for 1GB files)
        // This is kept for backward compatibility with small un-split files
        const fullPath = `clinical/${datasetId}.json`;
        const fullData = loadJSON<Record<string, unknown>[]>(fullPath);
        if (fullData && Array.isArray(fullData)) {
            filteredData = fullData.filter(row => row.gene === queryGene);
        }
    }

    // Process the data into visualization format
    if (filteredData.length > 0) {
        // Extract unique circRNAs for table display
        const seenCircIDs = new Set<string>();
        const annotations = filteredData.filter(row => {
            const circID = String(row.circID || row.id || '');
            if (seenCircIDs.has(circID)) return false;
            seenCircIDs.add(circID);
            return true;
        }).map(row => ({
            circID: String(row.circID || row.id || ''),
            ENT: String(row.ENT || ''),
            gene: String(row.gene || ''),
            index: String(row.index || ''),
            pos: String(row.pos || ''),
            numE: row.numE,
            lengthE: row.lengthE,
        }));

        if (datasetId === 'arul-et-al') {
            // Group by cancerType
            const byType: Record<string, number[]> = {};
            filteredData.forEach(row => {
                const ct = String(row.cancerType || 'Unknown');
                if (!byType[ct]) byType[ct] = [];
                const val = Number(row.circRNA_ncpm || row.value || row.counts || 0);
                if (!isNaN(val)) byType[ct].push(val);
            });
            const data = Object.entries(byType).map(([cancerType, values]) => ({ cancerType, values }));
            return res.json({ data, gene: queryGene, annotations });
        } else if (datasetId === 'breast-cohort') {
            // Group by subtype
            const bySubtype: Record<string, number[]> = {};
            filteredData.forEach(row => {
                const subtype = String(row.Sample_Type || row.cancer_type || row.Subtype || 'Unknown');
                if (!bySubtype[subtype]) bySubtype[subtype] = [];
                const val = Number(row.circRNA_rpkm || row.value || 0);
                if (!isNaN(val)) bySubtype[subtype].push(val);
            });
            const data = Object.entries(bySubtype).map(([subtype, values]) => ({ subtype, values }));
            return res.json({ data, gene: queryGene, annotations });
        } else if (datasetId === 'cpcg') {
            // CPCG - wide format with patient columns (CPCG_0100, CPCG_0183, etc.)
            // Extract values from all CPCG_ columns and aggregate
            const annotationFields = ['circID', 'ENT', 'gene', 'Gene', 'flanking', 'type', 'numE', 'lengthE', 'index', 'name', 'strand', 'chr', 'id', 'ENS'];

            // For each circRNA in the filtered data, collect all patient values
            const allValues: number[] = [];
            filteredData.forEach(row => {
                Object.keys(row).forEach(key => {
                    if (key.startsWith('CPCG_') && !annotationFields.includes(key)) {
                        const val = Number(row[key]);
                        if (!isNaN(val)) allValues.push(val);
                    }
                });
            });

            return res.json({ data: { values: allValues }, gene: queryGene, annotations });
        } else {
            // Default - treat as single group
            const values = filteredData.map(row => Number(row.value || 0)).filter(v => !isNaN(v));
            return res.json({ data: { values }, gene: queryGene, annotations });
        }
    }

    // Fallback: If no real data found, return empty or mock structure (to prevent UI crash)
    // Ideally we should return 404, but for now we return structure to allow UI to show "No data"
    const emptyResponse = datasetId === 'cpcg'
        ? { data: { values: [] }, gene: queryGene, annotations: [] }
        : { data: [], gene: queryGene, annotations: [] };

    res.json(emptyResponse);
});
