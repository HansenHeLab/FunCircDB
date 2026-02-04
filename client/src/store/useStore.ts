import { create } from 'zustand';

export type StudyId = 'her-et-al' | 'liu-et-al' | 'li-et-al' | 'chen-et-al' | null;
export type ClinicalDatasetId = 'arul-et-al' | 'cpcg' | 'breast-cohort' | null;
export type Timepoint = 'T8vsT0' | 'T16vsT0' | null;
export type TissueType = 'Colon' | 'Pancreas' | 'Brain' | 'Skin' | null;
export type CellLine = 'HT29' | '293FT' | 'HeLa' | null;

interface AppState {
    // Essentiality query state
    selectedStudy: StudyId;
    selectedCircRNA: string | null;
    selectedCircRNAId: string | null;
    selectedTimepoint: Timepoint;
    selectedCellLine: CellLine;
    selectedTissueType: TissueType;
    selectedTableRowIndex: number | null;

    // Clinical query state
    selectedClinicalDataset: ClinicalDatasetId;
    selectedClinicalCircRNA: string | null;
    selectedClinicalTableRowIndex: number | null;

    // Actions
    setSelectedStudy: (study: StudyId) => void;
    setSelectedCircRNA: (gene: string | null, circRNAId?: string | null) => void;
    setSelectedTimepoint: (timepoint: Timepoint) => void;
    setSelectedCellLine: (cellLine: CellLine) => void;
    setSelectedTissueType: (tissueType: TissueType) => void;
    setSelectedTableRowIndex: (index: number | null) => void;

    setSelectedClinicalDataset: (dataset: ClinicalDatasetId) => void;
    setSelectedClinicalCircRNA: (gene: string | null) => void;
    setSelectedClinicalTableRowIndex: (index: number | null) => void;

    resetEssentialityQuery: () => void;
    resetClinicalQuery: () => void;
}

export const useStore = create<AppState>((set) => ({
    // Initial state
    selectedStudy: null,
    selectedCircRNA: null,
    selectedCircRNAId: null,
    selectedTimepoint: null,
    selectedCellLine: null,
    selectedTissueType: null,
    selectedTableRowIndex: null,

    selectedClinicalDataset: null,
    selectedClinicalCircRNA: null,
    selectedClinicalTableRowIndex: null,

    // Actions
    setSelectedStudy: (study) => set({
        selectedStudy: study,
        // Reset dependent state
        selectedCircRNA: null,
        selectedCircRNAId: null,
        selectedTimepoint: null,
        selectedCellLine: null,
        selectedTissueType: null,
        selectedTableRowIndex: null,
    }),

    setSelectedCircRNA: (gene, circRNAId) => set((state) => ({
        selectedCircRNA: gene,
        selectedCircRNAId: circRNAId ?? null,
        // Only reset table row if gene changed (not when selecting a row)
        selectedTableRowIndex: circRNAId ? state.selectedTableRowIndex : null,
    })),

    setSelectedTimepoint: (timepoint) => set({ selectedTimepoint: timepoint }),
    setSelectedCellLine: (cellLine) => set({ selectedCellLine: cellLine, selectedCircRNA: null, selectedTableRowIndex: null }),
    setSelectedTissueType: (tissueType) => set({ selectedTissueType: tissueType, selectedCircRNA: null, selectedTableRowIndex: null }),
    setSelectedTableRowIndex: (index) => set({ selectedTableRowIndex: index }),

    setSelectedClinicalDataset: (dataset) => set({
        selectedClinicalDataset: dataset,
        selectedClinicalCircRNA: null,
        selectedClinicalTableRowIndex: null,
    }),

    setSelectedClinicalCircRNA: (gene) => set({
        selectedClinicalCircRNA: gene,
        selectedClinicalTableRowIndex: null,
    }),

    setSelectedClinicalTableRowIndex: (index) => set({ selectedClinicalTableRowIndex: index }),

    resetEssentialityQuery: () => set({
        selectedStudy: null,
        selectedCircRNA: null,
        selectedCircRNAId: null,
        selectedTimepoint: null,
        selectedCellLine: null,
        selectedTissueType: null,
        selectedTableRowIndex: null,
    }),

    resetClinicalQuery: () => set({
        selectedClinicalDataset: null,
        selectedClinicalCircRNA: null,
        selectedClinicalTableRowIndex: null,
    }),
}));
