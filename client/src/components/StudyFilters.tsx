import { useStore, type StudyId, type Timepoint, type CellLine, type TissueType } from '../store/useStore';
import { useGeneList } from '../hooks/useFunCircData';
import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * StudyFilters - Renders conditional filter dropdowns based on selected study
 * 
 * Study-specific filters:
 * - Her et al.: Timepoint (T8vsT0, T16vsT0)
 * - Liu et al.: Cell Line (HT29, 293FT, HeLa) + Timepoint
 * - Li et al.: Tissue Type (Colon, Pancreas, Brain, Skin)
 * - Chen et al.: Timepoint (T8vsT0, T16vsT0)
 */

// Study metadata
const STUDIES = [
    { id: 'her-et-al' as StudyId, name: 'Her et al.' },
    { id: 'liu-et-al' as StudyId, name: 'Liu et al.' },
    { id: 'li-et-al' as StudyId, name: 'Li et al.' },
    { id: 'chen-et-al' as StudyId, name: 'Chen et al.' },
];

const CELL_LINES: CellLine[] = ['HT29', '293FT', 'HeLa'];
const TISSUE_TYPES: TissueType[] = ['Colon', 'Pancreas', 'Brain', 'Skin'];
const TIMEPOINTS: Timepoint[] = ['T8vsT0', 'T16vsT0'];

interface StudyFiltersProps {
    showCircRNASelector?: boolean;
}

export function StudyFilters({ showCircRNASelector = true }: StudyFiltersProps) {
    const {
        selectedStudy,
        selectedCircRNA,
        selectedTimepoint,
        selectedCellLine,
        selectedTissueType,
        setSelectedStudy,
        setSelectedCircRNA,
        setSelectedTimepoint,
        setSelectedCellLine,
        setSelectedTissueType,
    } = useStore();

    // Local state for search input with debounce
    const [geneSearch, setGeneSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce gene search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(geneSearch), 300);
        return () => clearTimeout(timer);
    }, [geneSearch]);

    // Fetch gene list based on study + filters
    const { data: geneListData, isLoading: genesLoading } = useGeneList(
        selectedStudy,
        {
            cellLine: selectedCellLine,
            tissueType: selectedTissueType,
        }
    );

    // Filter genes by search term
    const filteredGenes = useMemo(() => {
        if (!geneListData?.genes) return [];
        if (!debouncedSearch) return geneListData.genes.slice(0, 100); // Show first 100 by default
        return geneListData.genes
            .filter(gene => gene.toLowerCase().includes(debouncedSearch.toLowerCase()))
            .slice(0, 100);
    }, [geneListData?.genes, debouncedSearch]);

    // Determine which filters to show based on study
    const showCellLine = selectedStudy === 'liu-et-al';
    const showTissueType = selectedStudy === 'li-et-al';
    const showTimepoint = selectedStudy === 'her-et-al' || selectedStudy === 'chen-et-al' || selectedStudy === 'liu-et-al';

    return (
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div className="card-header">
                <h2 className="card-title">Query circRNA Essentiality</h2>
            </div>

            <div style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {/* Study Selector */}
                <div className="form-group">
                    <label className="form-label">Select Study</label>
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

                {/* Cell Line (Liu et al.) */}
                {showCellLine && (
                    <div className="form-group">
                        <label className="form-label">Cell Line</label>
                        <select
                            className="form-select"
                            value={selectedCellLine || ''}
                            onChange={(e) => setSelectedCellLine((e.target.value || null) as CellLine)}
                        >
                            <option value="">Choose a cell line...</option>
                            {CELL_LINES.map(cl => (
                                <option key={cl} value={cl}>{cl}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Tissue Type (Li et al.) */}
                {showTissueType && (
                    <div className="form-group">
                        <label className="form-label">Tissue Type</label>
                        <select
                            className="form-select"
                            value={selectedTissueType || ''}
                            onChange={(e) => setSelectedTissueType((e.target.value || null) as TissueType)}
                        >
                            <option value="">Choose a tissue type...</option>
                            {TISSUE_TYPES.map(tt => (
                                <option key={tt} value={tt}>{tt}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Timepoint (Her, Chen, Liu) */}
                {showTimepoint && selectedStudy && (
                    <div className="form-group">
                        <label className="form-label">Timepoint</label>
                        <select
                            className="form-select"
                            value={selectedTimepoint || ''}
                            onChange={(e) => setSelectedTimepoint((e.target.value || null) as Timepoint)}
                            disabled={selectedStudy === 'liu-et-al' && !selectedCellLine}
                        >
                            <option value="">
                                {selectedStudy === 'liu-et-al' ? 'D1 vs D30' : 'Choose timepoint...'}
                            </option>
                            {selectedStudy !== 'liu-et-al' && TIMEPOINTS.map(tp => (
                                <option key={tp} value={tp}>{tp}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* CircRNA Search (with debounce) */}
                {showCircRNASelector && selectedStudy && (
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Query circRNA</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search by gene name (e.g., HIPK3)..."
                            value={geneSearch}
                            onChange={(e) => setGeneSearch(e.target.value)}
                            disabled={
                                (selectedStudy === 'liu-et-al' && !selectedCellLine) ||
                                (selectedStudy === 'li-et-al' && !selectedTissueType)
                            }
                        />

                        {/* Gene dropdown */}
                        {geneSearch.length >= 2 && (
                            <div style={{
                                marginTop: 'var(--spacing-xs)',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface)',
                            }}>
                                {genesLoading ? (
                                    <div style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                                        Loading...
                                    </div>
                                ) : filteredGenes.length === 0 ? (
                                    <div style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                                        No genes found
                                    </div>
                                ) : (
                                    filteredGenes.map(gene => (
                                        <div
                                            key={gene}
                                            style={{
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                cursor: 'pointer',
                                                background: selectedCircRNA === gene ? 'var(--color-accent-light)' : 'transparent',
                                            }}
                                            onClick={() => {
                                                setSelectedCircRNA(gene);
                                                setGeneSearch(gene);
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-background)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = selectedCircRNA === gene ? 'var(--color-accent-light)' : 'transparent'}
                                        >
                                            {gene}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selected state indicator */}
            {selectedCircRNA && (
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
                    <strong>{selectedCircRNA}</strong>
                    <button
                        className="btn btn-secondary"
                        style={{ marginLeft: 'auto', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                        onClick={() => { setSelectedCircRNA(null); setGeneSearch(''); }}
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
}

export default StudyFilters;
