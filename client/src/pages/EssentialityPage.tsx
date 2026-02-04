import { Suspense, lazy, useEffect } from 'react';
import { useStore, type StudyId, type Timepoint } from '../store/useStore';
import { TableSkeleton, DotMapSkeleton } from '../components/LoadingSpinner';
import { useGeneList, useCircRNAIsoforms, useEssentialityData, useStudyAnnotations, type CircRNAAnnotation } from '../hooks/useFunCircData';

// Lazy load visualizations
const EssentialityDotMap = lazy(() => import('../components/EssentialityDotMap'));
const LiuScreenPlot = lazy(() => import('../components/LiuScreenPlot'));

const STUDIES = [
    { id: 'her-et-al', name: 'Her et al.', hasTimepoint: true },
    { id: 'liu-et-al', name: 'Liu et al.', hasTissue: true },
    { id: 'li-et-al', name: 'Li et al.', hasCellLine: true },
    { id: 'chen-et-al', name: 'Chen et al.', hasTimepoint: true },
];

const TIMEPOINTS = ['T8vsT0', 'T16vsT0'];
const CELL_LINES = ['HT29', '293FT', 'HeLa'];
const TISSUES = ['Colon', 'Pancreas', 'Brain', 'Skin'];

export default function EssentialityPage() {
    const {
        selectedStudy,
        selectedCircRNA,
        selectedCircRNAId,
        selectedTimepoint,
        selectedCellLine,
        selectedTissueType,
        selectedTableRowIndex,
        setSelectedStudy,
        setSelectedCircRNA,
        setSelectedTimepoint,
        setSelectedCellLine,
        setSelectedTissueType,
        setSelectedTableRowIndex,
    } = useStore();

    // Get study config
    const studyConfig = STUDIES.find(s => s.id === selectedStudy);

    // Fetch gene list for dropdown (Strictly filtered by study parameters)
    const { data: geneListData, isLoading: genesLoading } = useGeneList(
        selectedStudy,
        { cellLine: selectedCellLine, tissueType: selectedTissueType }
    );

    // Fetch circRNA isoforms for selected gene (Table Data)
    const { data: isoformData, isLoading: isoformsLoading } = useCircRNAIsoforms(
        selectedStudy,
        selectedCircRNA,
        { cellLine: selectedCellLine, tissueType: selectedTissueType }
    );

    // Fetch FULL study annotations (Only for Li et al. CDCscreen plot background)
    const { data: fullStudyData, isLoading: fullDataLoading } = useStudyAnnotations(
        selectedStudy,
        { cellLine: selectedCellLine, tissueType: selectedTissueType }
    );

    // Fetch essentiality data when a row is selected (Dotmap Data)
    const { data: essentialityData, isLoading: essentialityLoading } = useEssentialityData(
        selectedStudy,
        selectedCircRNAId,
        { timepoint: selectedTimepoint, cellLine: selectedCellLine, tissueType: selectedTissueType }
    );

    // Study-specific column configuration - matches R Shiny exactly
    const getColumns = () => {
        if (selectedStudy === 'li-et-al') {
            // Li et al. uses CDCscreen: c("ENT","gene", "flanking", "numE", "lengthE", "index", "name", "start", "end", "Rank", "CDCscreen score")
            return ['ENT', 'gene', 'flanking', 'numE', 'lengthE', 'index', 'name', 'start', 'end', 'Rank', 'CDCscreen score'];
        }
        if (selectedStudy === 'liu-et-al') {
            // Liu et al. uses shRNA dotmap: c("circRNA_ID", "gene", "flanking", "numE", "lengthE", "index", "name", "start", "end")
            return ['circRNA_ID', 'gene', 'flanking', 'numE', 'lengthE', 'index', 'name', 'start', 'end'];
        }
        // Her et al. and Chen et al.: c("ENT","gene", "flanking", "numE", "lengthE", "index", "name", "start", "end")
        return ['ENT', 'gene', 'flanking', 'numE', 'lengthE', 'index', 'name', 'start', 'end'];
    };


    const handleRowClick = (index: number, row: CircRNAAnnotation) => {
        const circId = String(row.X || row.circRNA_ID || row.screenID || '');
        // Update the store with both gene and circRNA ID
        setSelectedCircRNA(String(row.gene || selectedCircRNA || ''), circId);
        // Set table row index AFTER setSelectedCircRNA
        setSelectedTableRowIndex(index);
    };

    // Reset table row when gene changes
    useEffect(() => {
        setSelectedTableRowIndex(null);
    }, [selectedCircRNA, setSelectedTableRowIndex]);

    return (
        <div>
            <h1 style={{ marginBottom: 'var(--spacing-lg)' }}>Query circRNA Essentiality</h1>

            {/* Study Selection and Filters */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-header">
                    <h2 className="card-title">Select CircRNA Screening Study</h2>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    {/* Study Selector */}
                    <div className="form-group">
                        <label className="form-label">Study</label>
                        <select
                            className="form-select"
                            value={selectedStudy || ''}
                            onChange={(e) => setSelectedStudy((e.target.value || null) as StudyId)}
                        >
                            <option value="">Choose a study...</option>
                            {STUDIES.map(study => (
                                <option key={study.id} value={study.id}>{study.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Timepoint (Her, Chen et al.) */}
                    {studyConfig?.hasTimepoint && (
                        <div className="form-group">
                            <label className="form-label">Timepoint</label>
                            <select
                                className="form-select"
                                value={selectedTimepoint || ''}
                                onChange={(e) => setSelectedTimepoint((e.target.value || null) as Timepoint)}
                            >
                                <option value="">Choose a timepoint...</option>
                                {TIMEPOINTS.map(tp => (
                                    <option key={tp} value={tp}>{tp}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Cell Line (Liu et al.) */}
                    {studyConfig?.hasCellLine && (
                        <div className="form-group">
                            <label className="form-label">Cell Line</label>
                            <select
                                className="form-select"
                                value={selectedCellLine || ''}
                                onChange={(e) => setSelectedCellLine((e.target.value || null) as 'HT29' | '293FT' | 'HeLa')}
                            >
                                <option value="">Choose a cell line...</option>
                                {CELL_LINES.map(cl => (
                                    <option key={cl} value={cl}>{cl}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Tissue Type (Li et al.) */}
                    {studyConfig?.hasTissue && (
                        <div className="form-group">
                            <label className="form-label">Tissue Type</label>
                            <select
                                className="form-select"
                                value={selectedTissueType || ''}
                                onChange={(e) => setSelectedTissueType((e.target.value || null) as 'Colon' | 'Pancreas' | 'Brain' | 'Skin')}
                            >
                                <option value="">Choose a tissue...</option>
                                {TISSUES.map(tt => (
                                    <option key={tt} value={tt}>{tt}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Gene Selector - DROPDOWN (Strictly Filtered) */}
                    {(selectedStudy && (selectedTimepoint || selectedCellLine || selectedTissueType)) && (
                        <div className="form-group">
                            <label className="form-label">Select circRNA</label>
                            <select
                                className="form-select"
                                value={selectedCircRNA || ''}
                                onChange={(e) => {
                                    setSelectedCircRNA(e.target.value || null);
                                    // Reset row selection is handled by store/effect
                                }}
                                disabled={genesLoading}
                            >
                                <option value="">
                                    {genesLoading ? 'Loading genes...' : 'Choose a gene...'}
                                </option>
                                {geneListData?.genes?.map(gene => (
                                    <option key={gene} value={gene}>{gene}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Isoform Table */}
            {selectedCircRNA && (
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <h3 className="card-title">Isoforms for {selectedCircRNA}</h3>
                    </div>
                    {isoformsLoading ? (
                        <TableSkeleton rows={3} />
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        {getColumns().map(col => (
                                            <th key={col}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isoformData?.data?.map((row, i) => (
                                        <tr
                                            key={i}
                                            className={selectedTableRowIndex === i ? 'selected' : ''}
                                            onClick={() => handleRowClick(i, row)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {getColumns().map(col => (
                                                <td key={col}>
                                                    {col === 'CDCscreen score' && row[col]
                                                        ? parseFloat(String(row[col])).toFixed(3)
                                                        : String(row[col as keyof typeof row] ?? '-')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {selectedTableRowIndex === null && (
                        <p style={{ color: 'var(--color-text-secondary)', padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                            Click on a row to view the visualization.
                        </p>
                    )}
                </div>
            )}

            {/* Visualization Section */}
            {selectedTableRowIndex !== null && selectedCircRNAId && (
                <Suspense fallback={<DotMapSkeleton />}>
                    {/* Conditionally Render Plot based on Study */}
                    {/* Li et al. uses CRISPR-RfxCas13d CDCscreen methodology */}
                    {selectedStudy === 'li-et-al' ? (
                        fullDataLoading ? (
                            <DotMapSkeleton />
                        ) : fullStudyData?.data ? (
                            <LiuScreenPlot
                                data={fullStudyData.data.map((d: any) => ({
                                    gene: String(d.gene || ''),
                                    rank: parseFloat(d.Rank) || 0,
                                    score: parseFloat(d['CDCscreen score']) || 0
                                }))}
                                highlightGene={selectedCircRNA || undefined}
                            />
                        ) : <div>No data for Li et al. CDCscreen Plot</div>
                    ) : (
                        /* Standard Dotmap for other studies - split into pos/neg */
                        essentialityLoading ? (
                            <DotMapSkeleton />
                        ) : essentialityData ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                                {/* Liu et al. - Single Unified Map (No Pos/Neg Split) */}
                                {(selectedStudy === 'liu-et-al' || !essentialityData.rowLabels.some(l => l.includes('_pos') || l.includes('_neg'))) ? (
                                    <div className="card">
                                        <h4 style={{ textAlign: 'center', marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>
                                            {selectedStudy === 'liu-et-al' ? 'Liu et al. shRNA Screen Results' : 'Screen Results'}
                                        </h4>
                                        <EssentialityDotMap
                                            title="Essentiality Score (log₂FC)"
                                            data={{
                                                values: essentialityData.values,
                                                pvalues: essentialityData.pvalues,
                                            }}
                                            rowLabels={essentialityData.rowLabels || []}
                                            colLabels={essentialityData.colLabels || []}
                                            showPValueLegend={false}
                                        />
                                    </div>
                                ) : (
                                    /* Her et al. and Chen et al. - Split into Positive and Negative Maps */
                                    <>
                                        {/* Filter and render pos rows (enriched) */}
                                        {(() => {
                                            const posIndices = essentialityData.rowLabels
                                                .map((label, i) => ({ label, i }))
                                                .filter(({ label }) => label.includes('_pos'));

                                            if (posIndices.length > 0) {
                                                return (
                                                    <div>
                                                        <h4 style={{ textAlign: 'center', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text)' }}>
                                                            Positive Selection (Enriched)
                                                        </h4>
                                                        <EssentialityDotMap
                                                            title="pos (enriched)"
                                                            data={{
                                                                values: posIndices.map(({ i }) => essentialityData.values[i]),
                                                                pvalues: posIndices.map(({ i }) => essentialityData.pvalues[i]),
                                                            }}
                                                            rowLabels={posIndices.map(({ label }) => label.replace('_pos', ''))}
                                                            colLabels={essentialityData.colLabels || []}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* Filter and render neg rows (depleted/essential) */}
                                        {(() => {
                                            const negIndices = essentialityData.rowLabels
                                                .map((label, i) => ({ label, i }))
                                                .filter(({ label }) => label.includes('_neg'));

                                            if (negIndices.length > 0) {
                                                return (
                                                    <div>
                                                        <h4 style={{ textAlign: 'center', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text)' }}>
                                                            Negative Selection (Depleted/Essential)
                                                        </h4>
                                                        <EssentialityDotMap
                                                            title="neg (depleted)"
                                                            data={{
                                                                values: negIndices.map(({ i }) => essentialityData.values[i]),
                                                                pvalues: negIndices.map(({ i }) => essentialityData.pvalues[i]),
                                                            }}
                                                            rowLabels={negIndices.map(({ label }) => label.replace('_neg', ''))}
                                                            colLabels={essentialityData.colLabels || []}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </>
                                )}

                                {/* Legend */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: 'var(--spacing-xl)',
                                    marginTop: 'var(--spacing-md)',
                                    fontSize: '0.875rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#dc2626' }}></div>
                                        <span>Positive log₂FC</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563eb' }}></div>
                                        <span>Negative log₂FC</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <div style={{ width: 12, height: 12, border: '1px solid #ddd', background: '#000' }}></div>
                                        <span>Significant (p &lt; 0.05)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <div style={{ width: 12, height: 12, border: '1px solid #ddd', background: '#fff' }}></div>
                                        <span>Not Significant</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="viz-container">
                                <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                                    No essentiality data available for this circRNA.
                                </p>
                            </div>
                        )
                    )}
                </Suspense>
            )}
        </div>
    );
}
