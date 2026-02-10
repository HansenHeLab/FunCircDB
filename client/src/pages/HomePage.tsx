import { useEffect, useRef, useState } from 'react';

/* ── Animated counter hook ──────────────────────────────── */
function useCountUp(target: number, duration = 2000) {
    // Skip digit-by-digit animation for large numbers (visually noisy)
    const shouldAnimate = target < 100;
    const [value, setValue] = useState(shouldAnimate ? 0 : target);
    const ref = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!shouldAnimate) return;
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    const start = performance.now();
                    const step = (now: number) => {
                        const progress = Math.min((now - start) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setValue(Math.floor(eased * target));
                        if (progress < 1) requestAnimationFrame(step);
                    };
                    requestAnimationFrame(step);
                }
            },
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [target, duration, shouldAnimate]);

    return { value, ref };
}

/* ── Stat box component ─────────────────────────────────── */
interface StatPair { value: number; label: string; prefix?: string }
interface StatBoxProps {
    title: string;
    icon: string;
    accentColor: string;
    stats: StatPair[];
}

function StatBox({ title, icon, accentColor, stats }: StatBoxProps) {
    const [hovered, setHovered] = useState(false);
    const counters = stats.map(s => useCountUp(s.value));

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                flex: '1 1 260px',
                maxWidth: 340,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderTop: `4px solid ${accentColor}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-lg) var(--spacing-xl)',
                textAlign: 'center',
                boxShadow: hovered
                    ? `0 8px 24px -4px ${accentColor}33`
                    : 'var(--shadow-md)',
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                cursor: 'default',
            }}
        >
            <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{icon}</div>
            <h4 style={{
                color: accentColor,
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: 'var(--spacing-md)',
            }}>
                {title}
            </h4>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--spacing-xl)',
            }}>
                {stats.map((s, i) => (
                    <div key={i} ref={counters[i].ref}>
                        <div style={{
                            fontSize: '2.2rem',
                            fontWeight: 800,
                            color: 'var(--color-text)',
                            lineHeight: 1.1,
                        }}>
                            {s.prefix ?? ''}{counters[i].value.toLocaleString()}
                        </div>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 500,
                            marginTop: 2,
                        }}>
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Page ────────────────────────────────────────────────── */
export default function HomePage() {
    return (
        <div>
            {/* Summary Statistic Boxes */}
            <div style={{
                display: 'flex',
                gap: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-md)',
                justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
                <StatBox
                    title="Screening Studies"
                    icon="🧬"
                    accentColor="#0D9488"
                    stats={[
                        { value: 4, label: 'Studies' },
                        { value: 15000, label: 'circRNAs Screened', prefix: '~' },
                    ]}
                />
                <StatBox
                    title="Cell Lines & Tissues"
                    icon="🔬"
                    accentColor="#F59E0B"
                    stats={[
                        { value: 28, label: 'Unique Cell Lines' },
                        { value: 10, label: 'Tissue Types' },
                    ]}
                />
                <StatBox
                    title="Clinical Samples"
                    icon="📊"
                    accentColor="#10B981"
                    stats={[
                        { value: 2600, label: 'Samples', prefix: '>' },
                        { value: 3, label: 'Cohorts' },
                    ]}
                />
            </div>

            <p style={{
                textAlign: 'center',
                fontSize: '0.78rem',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-2xl)',
            }}>
                Last updated: 2/9/2026
            </p>

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
            <div className="about-card">
                <p>
                    <strong>FunCirc</strong> is a database made with the purpose of being a resource of functional
                    circRNAs, integrating several circRNA screen studies. This platform enables researchers to
                    query circRNA essentiality data from multiple published studies and explore clinical expression
                    patterns across various cancer types and patient cohorts.
                </p>
            </div>

            <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="section-header">
                    <span>🧬</span>
                    <h3>Screening Studies</h3>
                </div>
                <ul className="study-list">
                    <li><strong>Her et al.</strong> – shRNA genome-wide circRNA screen (9,663 circRNAs, 7 cell lines, 7 tissue types)</li>
                    <li><a href="https://www.nature.com/articles/s41556-024-01467-y" target="_blank" rel="noopener noreferrer"><strong>Liu et al.</strong> – shRNA-based circRNA screen (3,354 circRNAs, 18 cell lines, 4 tissue types)</a></li>
                    <li><a href="https://www.nature.com/articles/s41592-020-01011-4" target="_blank" rel="noopener noreferrer"><strong>Li et al.</strong> – CRISPR-RfxCas13d circRNA screen (762 circRNAs, 3 cell lines, 3 tissue types)</a></li>
                    <li><a href="https://www.cell.com/cell/fulltext/S0092-8674(19)30058-3" target="_blank" rel="noopener noreferrer"><strong>Chen et al.</strong> – shRNA circRNA screen (1,507 circRNAs, 4 cell lines, 1 tissue type)</a></li>
                </ul>
            </div>

            <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="section-header">
                    <span>📊</span>
                    <h3>Clinical Datasets</h3>
                </div>
                <ul className="study-list clinical">
                    <li><a href="https://pubmed.ncbi.nlm.nih.gov/30735636/" target="_blank" rel="noopener noreferrer"><strong>Arul et al. (Vo et al.)</strong> – The landscape of circular RNA in cancer</a></li>
                    <li><a href="https://doi.org/10.1038/nature20788" target="_blank" rel="noopener noreferrer"><strong>CPCG (Fraser et al.)</strong> – Canadian Prostate Cancer Genome Network</a></li>
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
                        <li style={{ marginTop: 'var(--spacing-xs)' }}><strong>Background Color:</strong> None (threshold-based significance, not p-value)</li>
                        <li style={{ marginTop: 'var(--spacing-xs)', listStyle: 'none' }}>
                            <strong>Note:</strong> Context-specific circRNAs (WNT, KRAS, BRAF) were identified using t-test (P ≤ 0.15), but this is not displayed in the current visualization.
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

            {/* Citations Section */}
            <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div className="section-header">
                    <span>📚</span>
                    <h3>Citations</h3>
                </div>
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

