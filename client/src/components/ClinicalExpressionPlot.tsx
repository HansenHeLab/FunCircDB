import React, { useMemo, useRef, useCallback, useEffect } from 'react';

/**
 * ClinicalExpressionPlot - Box plot visualization for clinical expression data
 * 
 * Renders grouped box plots using SVG, similar to the R ggplot2 version.
 * Groups data by cancer type, subtype, or patient cohort.
 */

export interface BoxPlotData {
    group: string;
    values: number[];
}

export interface ClinicalExpressionPlotProps {
    data: BoxPlotData[];
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    colorScheme?: string[];
}

// Calculate box plot statistics
function calculateBoxStats(values: number[]) {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const q1Index = Math.floor(n * 0.25);
    const medianIndex = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);

    const q1 = sorted[q1Index];
    const median = sorted[medianIndex];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerWhisker = Math.max(sorted[0], q1 - 1.5 * iqr);
    const upperWhisker = Math.min(sorted[n - 1], q3 + 1.5 * iqr);

    // Outliers
    const outliers = sorted.filter(v => v < lowerWhisker || v > upperWhisker);

    return { q1, median, q3, lowerWhisker, upperWhisker, outliers, min: sorted[0], max: sorted[n - 1], n, mean: values.reduce((a, b) => a + b, 0) / n };
}

const DEFAULT_COLORS = [
    '#4299e1', '#48bb78', '#ed8936', '#f56565', '#9f7aea',
    '#38b2ac', '#ed64a6', '#667eea', '#fc8181', '#68d391',
];

interface TooltipState {
    visible: boolean;
    pinned: boolean;
    x: number;
    y: number;
    content: {
        group: string;
        n: number;
        mean: number;
        median: number;
        q1: number;
        q3: number;
        min: number;
        max: number;
    } | null;
}

export function ClinicalExpressionPlot({
    data,
    title,
    xAxisLabel = 'Group',
    yAxisLabel = 'Expression',
    colorScheme = DEFAULT_COLORS,
}: ClinicalExpressionPlotProps) {
    // Calculate stats for each group
    const boxStats = useMemo(() => {
        return data.map(d => ({
            group: d.group,
            stats: calculateBoxStats(d.values),
            values: d.values,
        }));
    }, [data]);

    // Tooltip state
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = React.useState<TooltipState>({
        visible: false,
        pinned: false,
        x: 0,
        y: 0,
        content: null,
    });

    // Layout
    const margin = { top: 60, right: 40, bottom: 120, left: 80 };
    const boxWidth = 60;
    const boxGap = 30;
    const chartWidth = Math.max(400, data.length * (boxWidth + boxGap) + margin.left + margin.right);
    const chartHeight = 430;
    const plotWidth = chartWidth - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;

    // Y scale
    const allValues = data.flatMap(d => d.values);
    const yMin = Math.min(...allValues) * 0.9;
    const yMax = Math.max(...allValues) * 1.1;
    const yScale = (v: number) => plotHeight - ((v - yMin) / (yMax - yMin)) * plotHeight;

    // X positions - center properly for single box
    const totalBoxSpace = data.length * boxWidth + (data.length - 1) * boxGap;
    const startX = margin.left + (plotWidth - totalBoxSpace) / 2 + boxWidth / 2;
    const xPositions = data.map((_, i) => startX + i * (boxWidth + boxGap));

    if (data.length === 0) {
        return (
            <div className="viz-container">
                <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    No data available for visualization.
                </p>
            </div>
        );
    }

    // SVG ref and download handler
    const svgRef = useRef<SVGSVGElement>(null);

    const handleDownloadSVG = useCallback(() => {
        if (!svgRef.current) return;
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'clinical_expression'}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [title]);

    // Pre-compute stable jitter offsets so points don't shift on re-render
    const jitterOffsets = useMemo(() => {
        return data.map(d => {
            // Simple seeded pseudo-random based on index
            return d.values.map((_, j) => {
                const seed = j * 9301 + 49297;
                return ((seed % 233280) / 233280 - 0.5) * boxWidth * 0.6;
            });
        });
    }, [data, boxWidth]);

    // Tooltip handlers
    const handleGroupMouseEnter = useCallback((e: React.MouseEvent, item: typeof boxStats[0]) => {
        if (tooltip.pinned || !item.stats) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const { n, mean, median, q1, q3, min, max } = item.stats;
        setTooltip({
            visible: true,
            pinned: false,
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            content: { group: item.group, n, mean, median, q1, q3, min, max },
        });
    }, [tooltip.pinned]);

    const handleGroupMouseLeave = useCallback(() => {
        if (tooltip.pinned) return;
        setTooltip(prev => ({ ...prev, visible: false }));
    }, [tooltip.pinned]);

    const handleGroupClick = useCallback((e: React.MouseEvent, item: typeof boxStats[0]) => {
        if (!item.stats) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const { n, mean, median, q1, q3, min, max } = item.stats;
        setTooltip({
            visible: true,
            pinned: true,
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            content: { group: item.group, n, mean, median, q1, q3, min, max },
        });
    }, []);

    useEffect(() => {
        if (!tooltip.pinned) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (tooltipRef.current?.contains(target)) return;
            setTooltip(prev => ({ ...prev, visible: false, pinned: false }));
        };

        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [tooltip.pinned]);

    return (
        <div className="viz-container" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                <h3 className="viz-title" style={{ margin: 0 }}>{title || 'Clinical Expression'}</h3>
                <button
                    onClick={handleDownloadSVG}
                    className='btn btn-secondary'
                >
					Export SVG
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </button>
            </div>

            <svg
                ref={svgRef}
                width={chartWidth}
                height={chartHeight}
                style={{ fontFamily: 'Inter, sans-serif', display: 'block', margin: '0 auto' }}
            >
                {/* Y Axis */}
                <line
                    x1={margin.left}
                    y1={margin.top}
                    x2={margin.left}
                    y2={margin.top + plotHeight}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                />

                {/* Y Axis ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const yVal = yMin + pct * (yMax - yMin);
                    const y = margin.top + yScale(yVal);
                    return (
                        <g key={pct}>
                            <line
                                x1={margin.left - 5}
                                y1={y}
                                x2={margin.left}
                                y2={y}
                                stroke="var(--color-text-secondary)"
                            />
                            <text
                                x={margin.left - 10}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="13"
                                fill="var(--color-text-secondary)"
                            >
                                {yVal.toFixed(1)}
                            </text>
                        </g>
                    );
                })}

                {/* Y Axis Label */}
                <text
                    x={margin.left - 50}
                    y={margin.top + plotHeight / 2}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="500"
                    fill="var(--color-text)"
                    transform={`rotate(-90, ${margin.left - 50}, ${margin.top + plotHeight / 2})`}
                >
                    {yAxisLabel}
                </text>

                {/* X Axis */}
                <line
                    x1={margin.left}
                    y1={margin.top + plotHeight}
                    x2={margin.left + plotWidth}
                    y2={margin.top + plotHeight}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                />

                {/* X Axis Label */}
                <text
                    x={margin.left + plotWidth / 2}
                    y={chartHeight - 10}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="500"
                    fill="var(--color-text)"
                >
                    {xAxisLabel}
                </text>

                {/* Box plots */}
                {boxStats.map((item, i) => {
                    if (!item.stats) return null;
                    const { q1, median, q3, lowerWhisker, upperWhisker, outliers } = item.stats;
                    const x = xPositions[i];
                    const color = colorScheme[i % colorScheme.length];

                    return (
                        <g
                            key={item.group}
                            onMouseEnter={(e) => handleGroupMouseEnter(e, item)}
                            onMouseLeave={handleGroupMouseLeave}
                            onClick={(e) => handleGroupClick(e, item)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Transparent hit target for easier hovering */}
                            <rect
                                x={x - boxWidth / 2 - 5}
                                y={margin.top}
                                width={boxWidth + 10}
                                height={plotHeight}
                                fill="transparent"
                            />

                            {/* Whisker line */}
                            <line
                                x1={x}
                                y1={margin.top + yScale(upperWhisker)}
                                x2={x}
                                y2={margin.top + yScale(lowerWhisker)}
                                stroke={color}
                                strokeWidth="1"
                            />

                            {/* Upper whisker cap */}
                            <line
                                x1={x - boxWidth / 4}
                                y1={margin.top + yScale(upperWhisker)}
                                x2={x + boxWidth / 4}
                                y2={margin.top + yScale(upperWhisker)}
                                stroke={color}
                                strokeWidth="1"
                            />

                            {/* Lower whisker cap */}
                            <line
                                x1={x - boxWidth / 4}
                                y1={margin.top + yScale(lowerWhisker)}
                                x2={x + boxWidth / 4}
                                y2={margin.top + yScale(lowerWhisker)}
                                stroke={color}
                                strokeWidth="1"
                            />

                            {/* Box */}
                            <rect
                                x={x - boxWidth / 2}
                                y={margin.top + yScale(q3)}
                                width={boxWidth}
                                height={yScale(q1) - yScale(q3)}
                                fill={color}
                                fillOpacity="0.3"
                                stroke={color}
                                strokeWidth="1.5"
                            />

                            {/* Median line */}
                            <line
                                x1={x - boxWidth / 2}
                                y1={margin.top + yScale(median)}
                                x2={x + boxWidth / 2}
                                y2={margin.top + yScale(median)}
                                stroke={color}
                                strokeWidth="2"
                            />

                            {/* Data points (stable jitter) */}
                            {item.values.map((v, j) => (
                                <circle
                                    key={j}
                                    cx={x + (jitterOffsets[i]?.[j] ?? 0)}
                                    cy={margin.top + yScale(v)}
                                    r={3}
                                    fill={color}
                                    fillOpacity="0.6"
                                />
                            ))}

                            {/* Outliers (distinct markers) */}
                            {outliers.map((v, j) => (
                                <circle
                                    key={`outlier-${j}`}
                                    cx={x}
                                    cy={margin.top + yScale(v)}
                                    r={4}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={1.5}
                                />
                            ))}

                            {/* Group label - pushed down */}
                            <text
                                x={x}
                                y={margin.top + plotHeight + 15}
                                textAnchor="end"
                                fontSize="13"
                                fill="var(--color-text)"
                                transform={`rotate(-45, ${x}, ${margin.top + plotHeight + 15})`}
                            >
                                {item.group}
                            </text>
                        </g>
                    );
                })}

                {/* Title */}
                {title && (
                    <text
                        x={chartWidth / 2}
                        y={25}
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="600"
                        fill="var(--color-text)"
                    >
                        {title}
                    </text>
                )}
            </svg>

            {/* Tooltip */}
            {tooltip.visible && tooltip.content && (
                <div
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -100%)',
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        pointerEvents: tooltip.pinned ? 'auto' : 'none',
                        userSelect: tooltip.pinned ? 'text' : 'none',
                        cursor: tooltip.pinned ? 'text' : 'default',
                        zIndex: 9999,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '2px' }}>
                        {tooltip.content.group}
                    </div>
                    <div>Count (n): {tooltip.content.n}</div>
                    <div>Mean: {tooltip.content.mean.toFixed(3)}</div>
                    <div>Median: {tooltip.content.median.toFixed(3)}</div>
                    <div>IQR: {(tooltip.content.q3 - tooltip.content.q1).toFixed(3)}</div>
                    <div style={{ color: '#aaa', fontSize: '10px', marginTop: '2px' }}>
                        Range: {tooltip.content.min.toFixed(2)} - {tooltip.content.max.toFixed(2)}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClinicalExpressionPlot;
