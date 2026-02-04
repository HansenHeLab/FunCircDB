// ============================================================
// TypeScript Types for FunCirc Data Structures
// ============================================================

// --- Study Types ---
export type StudyId = 'her-et-al' | 'liu-et-al' | 'li-et-al' | 'chen-et-al';
export type ClinicalDatasetId = 'arul-et-al' | 'cpcg' | 'breast-cohort';

// --- Shared Annotation ---
export interface CircRNAAnnotation {
    X: string;          // circID
    ENT: string;
    gene: string;
    flanking: string;
    numE: number;
    lengthE: number;
    index: string;      // comma-separated indices
    name: string;
    start: number;
    end: number;
    pos: string;
    chr: string;
    strand: string;
}

// --- Her et al. ---
export interface HerScreenDataRow {
    id: string;
    sample: string;     // cell line
    groups: string;     // 'circ' | 'linear'
    'T8vsT0.gene_summary.neg.lfc': number;
    'T8vsT0.gene_summary.pos.p.value': number;
    'T8vsT0.gene_summary.neg.p.value': number;
    'T16vsT0.gene_summary.neg.lfc': number;
    'T16vsT0.gene_summary.pos.p.value': number;
    'T16vsT0.gene_summary.neg.p.value': number;
}

// --- Liu et al. ---
export interface LiuDataRow extends CircRNAAnnotation {
    Rank: number;
    'CDCscreen score': number;
    'CircRNA genomic location(Chr:Start-End)': string;
}

// --- Li et al. ---
export interface LiDataRow extends CircRNAAnnotation {
    circRNA_ID: string;
    // Cell line columns with log2FC values
    [cellLine: string]: string | number;
}

// --- Chen et al. ---
export interface ChenDataRow {
    id: string;         // screenID
    gene: string;
    cell_line: string;
    timepoint: string;  // 'T8vsT0' | 'T16vsT0'
    'neg.lfc': number;
    'pos.p.value': number;
    'neg.p.value': number;
}

export interface ChenAnnotation extends CircRNAAnnotation {
    screenID: string;
}

// --- Clinical Datasets ---
export interface ArulDataRow {
    circID: string;
    gene: string;
    cancerType: string;
    circRNA_ncpm: number;
    ENT: string;
    index: string;
}

export interface CPCGDataRow {
    circID: string;
    gene: string;
    ENT: string;
    numE: number;
    lengthE: number;
    index: string;
    id: string;
    [patientId: string]: string | number;
}

export interface BreastCohortRow {
    circID: string;
    sampleName: string;
    circRNA_rpkm: number;
    Sample_Type: string;
    gene: string;
    ENT: string;
    numE: number;
    lengthE: number;
    index: string;
    id: string;
}

// --- Discriminated Union for Study Data ---
export type StudyData =
    | { type: 'her-et-al'; screenData: HerScreenDataRow[]; annotations: CircRNAAnnotation[] }
    | { type: 'liu-et-al'; cellLine: string; data: LiuDataRow[] }
    | { type: 'li-et-al'; tissueType: string; data: LiDataRow[] }
    | { type: 'chen-et-al'; circData: ChenDataRow[]; linearData: ChenDataRow[]; annotations: ChenAnnotation[] };

// --- API Response Types ---
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface GeneListResponse {
    genes: string[];
}

export interface EssentialityData {
    values: number[][];      // log2FC matrix
    pvalues: number[][];     // p-value matrix
    rowLabels: string[];     // circRNA labels
    colLabels: string[];     // cell line labels
}
