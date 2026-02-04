export default function HomePage() {
    return (
        <div>
            {/* Hero Section */}
            <div style={{
                display: 'flex',
                gap: 'var(--spacing-xl)',
                marginBottom: 'var(--spacing-2xl)',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                <div style={{
                    flex: '1 1 400px',
                    maxWidth: '600px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src="/Picture2.png"
                        alt="FunCirc Research Workflow"
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-md)'
                        }}
                    />
                </div>
                <div style={{
                    flex: '1 1 350px',
                    maxWidth: '450px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img
                        src="/Picture1.png"
                        alt="circRNA shRNA Library Composition"
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-md)'
                        }}
                    />
                </div>
            </div>

            {/* Divider */}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--spacing-xl) 0' }} />

            {/* Lab Link */}
            <h2 style={{ marginBottom: 'var(--spacing-md)' }}>
                <a
                    href="https://www.hansenhelab.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                >
                    He Lab @ UHN
                </a>
            </h2>

            {/* Description */}
            <div className="card" style={{ maxWidth: '900px' }}>
                <p style={{
                    fontSize: '1rem',
                    lineHeight: '1.8',
                    textAlign: 'justify',
                    color: 'var(--color-text)'
                }}>
                    <strong>FunCirc</strong> is a database made with the purpose of being a resource of functional
                    circRNAs, integrating several circRNA screen studies. This platform enables researchers to
                    query circRNA essentiality data from multiple published studies and explore clinical expression
                    patterns across various cancer types and patient cohorts.
                </p>

                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--color-accent)'
                }}>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>Screening Studies</h3>
                    <ul style={{ paddingLeft: 'var(--spacing-lg)', lineHeight: '2' }}>
                        <li><strong>Her et al.</strong> – shRNA genome-wide circRNA screen across 7 cancer cell lines (current project)</li>
                        <li><strong>Liu et al.</strong> – shRNA-based circRNA screen (18 cell lines, 4 tissue types)</li>
                        <li><strong>Li et al.</strong> – CRISPR-RfxCas13d circRNA screen (Colon, Pancreas, Brain, Skin)</li>
                        <li><strong>Chen et al.</strong> – shRNA circRNA screen in prostate cancer (LNCaP, V16A, 22Rv1, PC-3)</li>
                    </ul>
                </div>

                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--color-success)'
                }}>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>Clinical Datasets</h3>
                    <ul style={{ paddingLeft: 'var(--spacing-lg)', lineHeight: '2' }}>
                        <li><strong>Arul et al. (Vo et al.)</strong> – The landscape of circular RNA in cancer</li>
                        <li><strong>CPCG (Fraser et al.)</strong> – Canadian Prostate Cancer Genome Network</li>
                        <li><strong>In-house Breast Cohort</strong> – Breast cancer subtypes</li>
                    </ul>
                </div>

                {/* Dotmap Explanation Section */}
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--color-primary)'
                }}>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>Understanding the Dotmap Visualization</h3>

                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h4 style={{ fontSize: '1rem', color: 'var(--color-text)', marginBottom: 'var(--spacing-xs)' }}>
                            For <strong>Her et al.</strong> and <strong>Chen et al.</strong> (MAGeCK Analysis)
                        </h4>
                        <p style={{ lineHeight: '1.8', marginBottom: 'var(--spacing-sm)', fontSize: '0.95rem' }}>
                            These studies use <strong>MAGeCK</strong> analysis, splitting results into Positive and Negative selection tables:
                        </p>
                        <ul style={{ paddingLeft: 'var(--spacing-lg)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                            <li><strong>Dot Color (Log₂ Fold Change):</strong>
                                <ul style={{ paddingLeft: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
                                    <li><span style={{ color: '#2563eb', fontWeight: 'bold' }}>Blue</span> – Depleted</li>
                                    <li><span style={{ color: '#dc2626', fontWeight: 'bold' }}>Red</span> – Enriched</li>
                                    <li>Represents the median (or robust estimate) log₂FC of shRNAs targeting each circRNA, as calculated by MAGeCK</li>
                                </ul>
                            </li>
                            <li><strong>Background Color (P-value):</strong>
                                <ul style={{ paddingLeft: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
                                    <li><strong>Black</strong> – Statistically significant (p &lt; 0.05)</li>
                                    <li><strong>White</strong> – Not significant</li>
                                    <li>RRA p-value testing whether the circRNA's shRNAs rank higher (more depleted/enriched) than expected by chance</li>
                                </ul>
                            </li>
                            <li><strong>Pos vs Neg:</strong> Separate maps depending on whether the circRNA is selected for (enriched) or against (depleted).</li>
                        </ul>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '1rem', color: 'var(--color-text)', marginBottom: 'var(--spacing-xs)' }}>
                            For <strong>Liu et al.</strong> (PoolQ Analysis)
                        </h4>
                        <p style={{ lineHeight: '1.8', marginBottom: 'var(--spacing-sm)', fontSize: '0.95rem' }}>
                            <strong>Essentiality Score</strong> = mean log₂FC of 5 shRNAs per circRNA
                        </p>
                        <ul style={{ paddingLeft: 'var(--spacing-lg)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                            <li><strong>Dot Color (Essentiality Score):</strong>
                                <ul style={{ paddingLeft: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
                                    <li><span style={{ color: '#2563eb', fontWeight: 'bold' }}>Blue (Negative)</span> – Depleted
                                        <ul style={{ paddingLeft: 'var(--spacing-md)', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                            <li>Primary screen: ≤ −1 = core essential</li>
                                            <li>Secondary screen: ≤ −0.5 = essential</li>
                                        </ul>
                                    </li>
                                    <li><span style={{ color: '#dc2626', fontWeight: 'bold' }}>Red (Positive)</span> – Enriched</li>
                                </ul>
                            </li>
                            <li style={{ marginTop: 'var(--spacing-xs)' }}><strong>Background Color:</strong> None (threshold-based significance, not statistical tests for core essentiality)</li>
                            <li style={{ marginTop: 'var(--spacing-xs)', listStyle: 'none' }}>
                                <strong>Note:</strong> Context-specific circRNAs (WNT, KRAS, BRAF) used t-test P ≤ 0.15, but this is not displayed in the current visualization.
                            </li>
                        </ul>
                    </div>
                </div>

                {/* CDCscreen Score Explanation Section (Li et al.) */}
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--color-warning)'
                }}>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-primary)' }}>Understanding CDCscreen Score (Li et al.)</h3>
                    <p style={{ lineHeight: '1.8', marginBottom: 'var(--spacing-md)' }}>
                        For the <strong>Li et al.</strong> study, circRNA function is evaluated using the <strong>CDCscreen score</strong> (Cas13d-mediated CircRNA Screen). This score combines statistical significance with effect magnitude to identify circRNAs important for cell proliferation:
                    </p>
                    <div style={{
                        background: 'var(--color-surface)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'monospace',
                        textAlign: 'center',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <strong>CDCscreen score = scale[−log₁₀(P value)] + scale[|log₂(Mean of gRNA FC)|]</strong>
                    </div>
                    <ul style={{ paddingLeft: 'var(--spacing-lg)', lineHeight: '2' }}>
                        <li><strong>P-value:</strong> Statistical significance from MAGeCK permutation test of negatively-selected gRNAs (D1 vs D30)</li>
                        <li><strong>Mean FC:</strong> Mean fold change of negatively-selected gRNAs targeting the same circRNA between D30 and D1</li>
                        <li><strong>scale[]:</strong> Z-score normalization applied to both components</li>
                        <li><strong>Candidate Selection Criteria:</strong>
                            <ul style={{ paddingLeft: 'var(--spacing-md)', lineHeight: '1.8', marginTop: 'var(--spacing-xs)' }}>
                                <li><strong>CDCscreen score ≥ 2</strong></li>
                                <li><strong>≥ 2 negatively-selected gRNAs with FC ≤ 0.667</strong></li>
                                <li>circRNA must be expressed (FPBcirc {'>'} 0) in the cell line</li>
                            </ul>
                        </li>
                    </ul>
                    <p style={{ lineHeight: '1.8', marginTop: 'var(--spacing-md)', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                        CircRNAs meeting these criteria have positive effects on cell proliferation—their knockdown causes cells to die or grow slower (essential for viability). The score threshold of 2 corresponds to an empirical FDR {'<'} 0.1.
                    </p>
                </div>
            </div>

            {/* Citations Section */}
            <div className="card" style={{ maxWidth: '900px', marginTop: 'var(--spacing-xl)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>Citations</h3>
                <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text)', lineHeight: '1.6' }}>
                    This project utilizes datasets and methodologies from multiple studies. If you use FunCirc in your research, please consider citing the following sources:
                </p>

                <div style={{ fontSize: '0.9rem', lineHeight: '1.8', color: 'var(--color-text-secondary)' }}>
                    <p style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-md)', borderLeft: '2px solid var(--color-border)' }}>
                        <strong>Liu et al.:</strong> Liu L, Neve M, Perlaza-Jimenez L, Xi X, Purcell J, Hawdon A, et al. Systematic loss-of-function screens identify pathway-specific functional circular RNAs. <em>Nature Cell Biology</em>. 2024 Aug;26(8):1359–72.{' '}
                        <a href="https://www.nature.com/articles/s41556-024-01467-y" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Link</a>
                    </p>

                    <p style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-md)', borderLeft: '2px solid var(--color-border)' }}>
                        <strong>Li et al.:</strong> Li S, Li X, Xue W, Zhang L, Yang LZ, Cao SM, et al. Screening for functional circular RNAs using the CRISPR–Cas13 system. <em>Nature Methods</em>. 2020 Dec 7;18(1):51–9.{' '}
                        <a href="https://www.nature.com/articles/s41592-020-01011-4" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Link</a>
                    </p>

                    <p style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-md)', borderLeft: '2px solid var(--color-border)' }}>
                        <strong>Chen et al.:</strong> Chen S, Huang V, Xu X, Livingstone J, Soares F, Jeon J, et al. Widespread and Functional RNA Circularization in Localized Prostate Cancer. <em>Cell</em>. 2019 Feb 1;176(4):831-843.e22.{' '}
                        <a href="https://www.cell.com/cell/fulltext/S0092-8674(19)30058-3" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Link</a>
                    </p>

                    <p style={{ marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-md)', borderLeft: '2px solid var(--color-border)' }}>
                        <strong>CPCG (Fraser et al.):</strong> Fraser M, Sabelnykova VY, Yamaguchi TN, Heisler LE, Livingstone J, Huang V, et al. Genomic hallmarks of localized, non-indolent prostate cancer. <em>Nature</em>. 2017 Jan;541(7637):359-364.{' '}
                        <a href="https://doi.org/10.1038/nature20788" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Link</a>
                    </p>

                    <p style={{ paddingLeft: 'var(--spacing-md)', borderLeft: '2px solid var(--color-border)' }}>
                        <strong>Arul et al. (Vo et al.):</strong> Vo JN, Cieslik M, Zhang Y, Shukla S, Xiao L, Zhang Y, et al. The Landscape of Circular RNA in Cancer. <em>Cell</em>. 2019 Feb 1;176(4):869-881.e13.{' '}
                        <a href="https://pubmed.ncbi.nlm.nih.gov/30735636/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Link</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
