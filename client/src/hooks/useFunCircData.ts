import { useQuery } from '@tanstack/react-query';
import type { StudyId, ClinicalDatasetId, Timepoint, CellLine, TissueType } from '../store/useStore';

const API_BASE = '/api';

// --- Types ---
export interface Study {
    id: string;
    name: string;
    description: string;
}

export interface CircRNAAnnotation {
    X: string;
    ENT: string;
    gene: string;
    flanking: string;
    numE: number;
    lengthE: number;
    index: string;
    name: string;
    start: number;
    end: number;
    pos: string;
    chr: string;
    strand: string;
    // Liu-specific
    Rank?: number;
    'CDCscreen score'?: number;
    // Li-specific
    circRNA_ID?: string;
    // Chen-specific
    screenID?: string;
}

export interface EssentialityData {
    values: number[][];
    pvalues: number[][];
    rowLabels: string[];
    colLabels: string[];
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// --- Fetchers ---
async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return response.json();
}

// --- Hooks ---

/** Fetch list of all available studies */
export function useStudies() {
    return useQuery({
        queryKey: ['studies'],
        queryFn: () => fetchJson<Study[]>(`${API_BASE}/studies`),
        staleTime: Infinity, // Studies list never changes
    });
}

/** Fetch gene list for a study (for dropdown) */
export function useGeneList(
    studyId: StudyId,
    options?: { cellLine?: CellLine; tissueType?: TissueType }
) {
    const params = new URLSearchParams();
    if (options?.cellLine) params.set('cellLine', options.cellLine);
    if (options?.tissueType) params.set('tissueType', options.tissueType);

    return useQuery({
        queryKey: ['genes', studyId, options?.cellLine, options?.tissueType],
        queryFn: () => fetchJson<{ genes: string[] }>(`${API_BASE}/studies/${studyId}/genes?${params}`),
        enabled: !!studyId,
        staleTime: 5 * 60 * 1000,
    });
}

/** Fetch circRNA isoforms for a gene */
export function useCircRNAIsoforms(
    studyId: StudyId,
    gene: string | null,
    options?: { cellLine?: CellLine; tissueType?: TissueType }
) {
    const params = new URLSearchParams();
    if (gene) params.set('gene', gene);
    if (options?.cellLine) params.set('cellLine', options.cellLine);
    if (options?.tissueType) params.set('tissueType', options.tissueType);

    return useQuery({
        queryKey: ['circrnas', studyId, gene, options?.cellLine, options?.tissueType],
        queryFn: () => fetchJson<{ data: CircRNAAnnotation[] }>(
            `${API_BASE}/studies/${studyId}/annotations?${params}`
        ),
        enabled: !!studyId && !!gene,
        staleTime: 5 * 60 * 1000,
    });
}

/** Fetch ALL annotations for a study (needed for global plots like Liu Screen) */
export function useStudyAnnotations(
    studyId: StudyId,
    options?: { cellLine?: CellLine; tissueType?: TissueType }
) {
    const params = new URLSearchParams();
    if (options?.cellLine) params.set('cellLine', options.cellLine);
    if (options?.tissueType) params.set('tissueType', options.tissueType);

    return useQuery({
        queryKey: ['annotations', studyId, options?.cellLine, options?.tissueType],
        queryFn: () => fetchJson<{ data: CircRNAAnnotation[] }>(`${API_BASE}/studies/${studyId}/annotations?${params}`),
        // Enable only for Liu et al. when cellLine is selected
        enabled: !!studyId && studyId === 'liu-et-al' && !!options?.cellLine,
        staleTime: 30 * 60 * 1000,
    });
}

/** Fetch essentiality data for dotmap visualization */
export function useEssentialityData(
    studyId: StudyId,
    circRNAId: string | null,
    options?: { timepoint?: Timepoint; cellLine?: CellLine; tissueType?: TissueType }
) {
    const params = new URLSearchParams();
    if (circRNAId) params.set('circRNAId', circRNAId);
    if (options?.timepoint) params.set('timepoint', options.timepoint);
    if (options?.cellLine) params.set('cellLine', options.cellLine);
    if (options?.tissueType) params.set('tissueType', options.tissueType);

    return useQuery({
        queryKey: ['essentiality', studyId, circRNAId, options],
        queryFn: () => fetchJson<EssentialityData>(`${API_BASE}/studies/${studyId}/essentiality?${params}`),
        enabled: !!studyId && !!circRNAId,
        staleTime: 5 * 60 * 1000,
    });
}

// --- Clinical Dataset Hooks ---

/** Fetch list of clinical datasets */
export function useClinicalDatasets() {
    return useQuery({
        queryKey: ['clinical-datasets'],
        queryFn: () => fetchJson<Study[]>(`${API_BASE}/clinical`),
        staleTime: Infinity,
    });
}

/** Fetch gene list for a clinical dataset */
export function useClinicalGeneList(datasetId: ClinicalDatasetId) {
    return useQuery({
        queryKey: ['clinical-genes', datasetId],
        queryFn: () => fetchJson<{ genes: string[] }>(`${API_BASE}/clinical/${datasetId}/genes`),
        enabled: !!datasetId,
        staleTime: 5 * 60 * 1000,
    });
}

/** Fetch expression data for a circRNA */
export function useClinicalExpression(datasetId: ClinicalDatasetId, gene: string | null) {
    return useQuery({
        queryKey: ['clinical-expression', datasetId, gene],
        queryFn: () => fetchJson<{ data: unknown; gene: string }>(`${API_BASE}/clinical/${datasetId}/expression?gene=${encodeURIComponent(gene!)}`),
        enabled: !!datasetId && !!gene,
        staleTime: 5 * 60 * 1000,
    });
}
