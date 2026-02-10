import { Suspense, lazy } from 'react';
import { useStore, type ClinicalDatasetId } from '../store/useStore';
import { useClinicalDatasets, useClinicalGeneList, useClinicalExpression } from '../hooks/useFunCircData';
import { DotMapSkeleton } from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';

// Lazy load visualization
const ClinicalExpressionPlot = lazy(() => import('../components/ClinicalExpressionPlot'));

const DATASET_INFO: Record<string, { xLabel: string; groupField: string }> = {
    'arul-et-al': { xLabel: 'Cancer Type', groupField: 'cancerType' },
    'cpcg': { xLabel: 'Patients', groupField: 'patient' },
    'breast-cohort': { xLabel: 'Breast Cancer Subtype', groupField: 'subtype' },
};

export default function ClinicalExpressionPage() {
    const {
        selectedClinicalDataset,
        selectedClinicalCircRNA,
        selectedClinicalTableRowIndex,
        setSelectedClinicalDataset,
        setSelectedClinicalCircRNA,
        setSelectedClinicalTableRowIndex,
    } = useStore();

    // Fetch datasets list
    const { data: datasets } = useClinicalDatasets();

    // Fetch gene list for selected dataset (for dropdown)
    const { data: geneListData, isLoading: genesLoading } = useClinicalGeneList(selectedClinicalDataset);

    // Fetch expression data
    const { data: expressionData, isLoading: expressionLoading } = useClinicalExpression(
        selectedClinicalDataset,
        selectedClinicalCircRNA
    );

    // Get annotations from expression data
    const annotations = (expressionData as any)?.annotations || [];

    // Transform expression data for box plot based on dataset type and selected row
    const boxPlotData = (() => {
        if (!expressionData?.rawData || selectedClinicalTableRowIndex === null || !annotations[selectedClinicalTableRowIndex]) {
            return [];
        }

        const rawData = expressionData.rawData as any[];
        const selectedIsoform = annotations[selectedClinicalTableRowIndex];
        const selectedCircID = selectedIsoform.circID;

        // Helper to check if a row matches the selected isoform
        // We match primarily on circID logic if available
        const isMatch = (row: any) => String(row.circID) === String(selectedCircID);

        if (selectedClinicalDataset === 'breast-cohort') {
            // Long format: Filter by circID, then group by Sample_Type
            const filtered = rawData.filter(isMatch);
            const byGroup: Record<string, number[]> = {};
            filtered.forEach(row => {
                const group = String(row.Sample_Type || row.cancer_type || row.Subtype || 'Unknown');
                if (!byGroup[group]) byGroup[group] = [];
                const val = Number(row.circRNA_rpkm || row.value || 0);
                if (!isNaN(val)) byGroup[group].push(val);
            });
            return Object.entries(byGroup).map(([group, values]) => ({ group, values }));
        }

        if (selectedClinicalDataset === 'cpcg') {
            // Wide format: Filter by circID (should be 1 row), extract patient columns
            const matchedRow = rawData.find(isMatch);
            if (!matchedRow) return [];

            const annotationFields = ['circID', 'ENT', 'gene', 'Gene', 'flanking', 'type', 'numE', 'lengthE', 'index', 'name', 'strand', 'chr', 'id', 'ENS'];
            const values: number[] = [];

            Object.keys(matchedRow).forEach(key => {
                // CPCG columns start with CPCG_ usually, or just non-annotation fields
                if ((key.startsWith('CPCG_') || !annotationFields.includes(key)) && !isNaN(Number(matchedRow[key]))) {
                    const val = Number(matchedRow[key]);
                    values.push(val);
                }
            });
            return [{ group: 'All Patients', values }];
        }

        if (selectedClinicalDataset === 'arul-et-al') {
            // Long format: Filter by circID, group by cancerType
            const filtered = rawData.filter(isMatch);
            const byGroup: Record<string, number[]> = {};
            filtered.forEach(row => {
                const group = String(row.cancerType || 'Unknown');
                if (!byGroup[group]) byGroup[group] = [];
                const val = Number(row.circRNA_ncpm || row.value || 0);
                if (!isNaN(val)) byGroup[group].push(val);
            });
            return Object.entries(byGroup).map(([group, values]) => ({ group, values }));
        }

        // Default / Fallback
        const filtered = rawData.filter(isMatch);
        const values = filtered.map(row => Number(row.value || 0)).filter(v => !isNaN(v));
        return [{ group: 'All Samples', values }];
    })();

    // Columns for table display - matches R Shiny exactly
    const getTableColumns = () => {
        if (selectedClinicalDataset === 'cpcg') {
            // R Shiny: c("ENT", "gene", "numE", "lengthE", "index", "id")
            return ['ENT', 'gene', 'numE', 'lengthE', 'index', 'id'];
        }
        if (selectedClinicalDataset === 'breast-cohort') {
            // R Shiny: c("ENT", "gene", "numE", "lengthE", "index", "id")
            return ['ENT', 'gene', 'numE', 'lengthE', 'index', 'id'];
        }
        // Arul et al.: c("ENT", "gene", "index")
        return ['ENT', 'gene', 'index'];
    };

    return (
        <div>
            <h1 style={{ marginBottom: 'var(--spacing-lg)' }}>Query circRNA Clinical Expression</h1>

            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-header">
                    <h2 className="card-title">Select Dataset</h2>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                    {/* Dataset Selector */}
                    <div className="form-group">
                        <label className="form-label">Clinical Dataset</label>
                        <select
                            className="form-select"
                            value={selectedClinicalDataset || ''}
                            onChange={(e) => setSelectedClinicalDataset((e.target.value || null) as ClinicalDatasetId)}
                        >
                            <option value="">Choose a dataset...</option>
                            {datasets?.map(ds => (
                                <option key={ds.id} value={ds.id}>{ds.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* CircRNA/Gene Selector - SEARCHABLE DROPDOWN */}
                    {selectedClinicalDataset && (
                        <div className="form-group">
                            <label className="form-label">Select circRNA</label>
                            <SearchableSelect
                                options={geneListData?.genes ?? []}
                                value={selectedClinicalCircRNA}
                                onChange={(val) => {
                                    setSelectedClinicalCircRNA(val);
                                    setSelectedClinicalTableRowIndex(null);
                                }}
                                placeholder={genesLoading ? 'Loading genes...' : 'Type to search or select...'}
                                disabled={genesLoading}
                            />
                        </div>
                    )}
                </div>

                {/* Selected indicator */}
                {selectedClinicalCircRNA && (
                    <div style={{
                        marginTop: 'var(--spacing-md)',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        background: 'var(--color-background)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-sm)'
                    }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Selected:</span>
                        <strong>{selectedClinicalCircRNA}</strong>
                        <button
                            className="btn btn-secondary"
                            style={{ marginLeft: 'auto', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                            onClick={() => { setSelectedClinicalCircRNA(null); }}
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Results Table (placeholder - would show circRNA annotation) */}
            {selectedClinicalCircRNA && (
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <h3 className="card-title">circRNA Information</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {getTableColumns().map(col => (
                                        <th key={col}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {annotations.length > 0 ? annotations.map((row: any, i: number) => (
                                    <tr
                                        key={i}
                                        className={selectedClinicalTableRowIndex === i ? 'selected' : ''}
                                        onClick={() => setSelectedClinicalTableRowIndex(i)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {getTableColumns().map(col => (
                                            <td key={col}>{row[col] ?? '-'}</td>
                                        ))}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={getTableColumns().length} style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                            {expressionLoading ? 'Loading...' : 'No circRNA data found for this gene'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {selectedClinicalTableRowIndex === null && (
                        <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                            Click on a row to view the expression boxplot.
                        </p>
                    )}
                </div>
            )}

            {/* Expression Plot */}
            {selectedClinicalCircRNA && selectedClinicalTableRowIndex !== null && (
                <Suspense fallback={<DotMapSkeleton />}>
                    {expressionLoading ? (
                        <DotMapSkeleton />
                    ) : boxPlotData.length > 0 ? (
                        <ClinicalExpressionPlot
                            data={boxPlotData}
                            title={`${selectedClinicalCircRNA} Expression`}
                            xAxisLabel={DATASET_INFO[selectedClinicalDataset || '']?.xLabel || 'Group'}
                            yAxisLabel="Normalized Expression"
                        />
                    ) : (
                        <div className="viz-container">
                            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                                No expression data available.
                            </p>
                        </div>
                    )}
                </Suspense>
            )}

            {/* Instruction */}
            {!selectedClinicalDataset && (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
                        Select a clinical dataset to begin querying circRNA expression data.
                    </p>
                </div>
            )}

            {/* Instruction when dataset selected but no gene */}
            {selectedClinicalDataset && !selectedClinicalCircRNA && (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Select a circRNA from the dropdown above to view expression data.
                    </p>
                </div>
            )}
        </div>
    );
}
