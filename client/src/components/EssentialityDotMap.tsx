import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================
// EssentialityDotMap - SVG visualization ported from R's create.dotmap
// ============================================================

export interface DotMapData {
    values: number[][];      // log2FC matrix [rows][cols]
    pvalues: number[][];     // p-value matrix [rows][cols]
}

export interface EssentialityDotMapProps {
    data: DotMapData;
    rowLabels: string[];
    colLabels: string[];
    title?: string;
    onCellClick?: (row: number, col: number, value: number, pvalue: number) => void;
    showPValueLegend?: boolean;
	selectedStudy: string | null
}

// BoutrosLab dotmap color palette
const COLOR_NEGATIVE = '#2563eb';  // Blue for negative log2FC
const COLOR_POSITIVE = '#dc2626';  // Red for positive log2FC
const COLOR_NEUTRAL = '#ffffff';   // White for zero

// Discrete p-value thresholds and their colors (black → white)
const PVALUE_LEVELS: { threshold: number; color: string; label: string }[] = [
	{ threshold: 0.001, color: 'rgb(0, 0, 0)',       label: '≤ 0.001' },
	{ threshold: 0.01,  color: 'rgb(64, 64, 64)',     label: '≤ 0.01' },
	{ threshold: 0.05,  color: 'rgb(128, 128, 128)',   label: '≤ 0.05' },
	{ threshold: 0.5,   color: 'rgb(192, 192, 192)',   label: '≤ 0.5' },
	{ threshold: 1,     color: 'rgb(255, 255, 255)',   label: '≤ 1' },
];

const Legend = (selectedStudy: string | null) => {
	return (
        <div className='legend'>
			<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
				<div style={{ width: 12, height: 12, borderRadius: '50%', background: '#dc2626' }}></div>
				<span>Positive log₂FC</span>
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
				<div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563eb' }}></div>
				<span>Negative log₂FC</span>
			</div>
			{selectedStudy !== 'liu-et-al' && (
				<>
					{PVALUE_LEVELS.map(level => (
						<div key={level.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
							<div style={{ width: 12, height: 12, border: '1px solid #ddd', background: level.color }}></div>
							<span>p {level.label}</span>
						</div>
					))}
				</>
			)}
        </div>
	)
}

// P-value color scale — discrete thresholds (black → white)
function getPValueColor(pval: number): string {
    for (const level of PVALUE_LEVELS) {
        if (pval <= level.threshold) return level.color;
    }
    return 'rgb(255, 255, 255)';
}

// Dot size function: 0.1 + (2 * |log2FC|)
function getDotSize(value: number, maxRadius: number): number {
    const baseSize = 0.1;
    const scale = 2;
    const size = baseSize + (scale * Math.abs(value));
    // Normalize to max radius, with minimum visible size
    return Math.max(3, Math.min(maxRadius, size * (maxRadius / 5)));
}

// Dot color based on sign of log2FC
function getDotColor(value: number): string {
    if (value < 0) return COLOR_NEGATIVE;
    if (value > 0) return COLOR_POSITIVE;
    return COLOR_NEUTRAL;
}

interface TooltipState {
    visible: boolean;
    pinned: boolean;
    x: number;
    y: number;
    content: {
        rowLabel: string;
        colLabel: string;
        value: number;
        pvalue: number;
    } | null;
}

export function EssentialityDotMap({
    data,
    rowLabels,
    colLabels,
    title,
    onCellClick,
    showPValueLegend = true,
	selectedStudy,
}: EssentialityDotMapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        pinned: false,
        x: 0,
        y: 0,
        content: null,
    });

    // Layout constants
    const cellSize = 60;
    const leftMargin = 250;  // Increased space for long row labels like circGENE(1,2,3)_neg
    const topMargin = 80;    // Space for title and column labels
    const bottomMargin = 180; // Increased space for legend (dots + text)
    const rightMargin = 180; // Increased space for size legend dots

    const numRows = data.values.length;
    const numCols = data.values[0]?.length ?? 0;

    const svgWidth = leftMargin + numCols * cellSize + rightMargin;
    // Ensure minimum height for legend visibility even with single row
    const minHeight = 350;
    const calculatedHeight = topMargin + numRows * cellSize + bottomMargin;
    const svgHeight = Math.max(minHeight, calculatedHeight);
    const maxRadius = cellSize * 0.4;

    // // Calculate min/max for legend
    // const allValues = useMemo(() => data.values.flat(), [data.values]);
    // const minValue = Math.min(...allValues);
    // const maxValue = Math.max(...allValues);

    // Show tooltip on hover (positioned above the dot using its screen rect)
    const handleMouseEnter = useCallback((
        e: React.MouseEvent<SVGCircleElement>,
        row: number,
        col: number
    ) => {
        // Don't override a pinned tooltip
        if (tooltip.pinned) return;

        const circle = e.currentTarget;
        const rect = circle.getBoundingClientRect();

        setTooltip({
            visible: true,
            pinned: false,
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            content: {
                rowLabel: rowLabels[row],
                colLabel: colLabels[col],
                value: data.values[row][col],
                pvalue: data.pvalues[row][col],
            },
        });
    }, [rowLabels, colLabels, data, tooltip.pinned]);

    const handleMouseLeave = useCallback(() => {
        if (tooltip.pinned) return;
        setTooltip(prev => ({ ...prev, visible: false }));
    }, [tooltip.pinned]);

    // Click on dot to pin the tooltip for copy-pasting
    const handleDotClick = useCallback((
        e: React.MouseEvent<SVGCircleElement>,
        row: number,
        col: number
    ) => {
        const circle = e.currentTarget;
        const rect = circle.getBoundingClientRect();

        setTooltip({
            visible: true,
            pinned: true,
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            content: {
                rowLabel: rowLabels[row],
                colLabel: colLabels[col],
                value: data.values[row][col],
                pvalue: data.pvalues[row][col],
            },
        });

        if (onCellClick) {
            onCellClick(row, col, data.values[row][col], data.pvalues[row][col]);
        }
    }, [rowLabels, colLabels, data, onCellClick]);

    // Click outside tooltip or dots to dismiss pinned tooltip
    useEffect(() => {
        if (!tooltip.pinned) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (tooltipRef.current?.contains(target)) return;
            if ((target as unknown as SVGElement).closest?.('circle')) return;

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



    const handleExportSVG = useCallback(() => {
        if (!svgRef.current) return;
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dotmap_${title?.replace(/\s+/g, '_') || 'export'}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [title]);

    if (numRows === 0 || numCols === 0) {
        return (
            <div className="viz-container">
                <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                    No data available for visualization.
                </p>
            </div>
        );
    }

    return (
        <div className="viz-container" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h3 className="viz-title">{title || 'Essentiality DotMap'}</h3>
                <button className="btn btn-secondary" onClick={handleExportSVG}>
					Export SVG
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </button>
            </div>

            <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center'}}>
                <svg
                    ref={svgRef}
                    width={svgWidth}
                    height={svgHeight}
                    style={{ fontFamily: 'Inter, sans-serif', display: 'block', flex: '0 0 auto' }}
                >
                    {/* Title */}
                    {title && (
                        <text
                            x={leftMargin + (numCols * cellSize) / 2}
                            y={25}
                            textAnchor="middle"
                            fontSize="18"
                            fontWeight="600"
                            fill="var(--color-text)"
                        >
                            {title}
                        </text>
                    )}

                    {/* Column labels */}
                    {colLabels.map((label, i) => (
                        <text
                            key={`col-${i}`}
                            x={leftMargin + i * cellSize + cellSize / 2}
                            y={topMargin - 10}
                            textAnchor="middle"
                            fontSize="14"
                            fontWeight="500"
                            fill="var(--color-text)"
                        >
                            {label}
                        </text>
                    ))}

                    {/* Row labels */}
                    {rowLabels.map((label, i) => (
                        <text
                            key={`row-${i}`}
                            x={leftMargin - 10}
                            y={topMargin + i * cellSize + cellSize / 2 + 4}
                            textAnchor="end"
                            fontSize="14"
                            fontWeight="500"
                            fill="var(--color-text)"
                        >
                            {label}
                        </text>
                    ))}

                    {/* Grid and cells */}
                    <g>
                        {/* Background cells with p-value colors */}
                        {data.values.map((row, i) =>
                            row.map((_, j) => (
                                <rect
                                    key={`bg-${i}-${j}`}
                                    x={leftMargin + j * cellSize}
                                    y={topMargin + i * cellSize}
                                    width={cellSize}
                                    height={cellSize}
                                    fill={showPValueLegend ? getPValueColor(data.pvalues[i][j]) : '#ffffff'}
                                    stroke="var(--color-border)"
                                    strokeWidth="0.5"
                                />
                            ))
                        )}

                        {/* Dots */}
                        {data.values.map((row, i) =>
                            row.map((value, j) => (
                                <circle
                                    key={`dot-${i}-${j}`}
                                    cx={leftMargin + j * cellSize + cellSize / 2}
                                    cy={topMargin + i * cellSize + cellSize / 2}
                                    r={getDotSize(value, maxRadius)}
                                    fill={getDotColor(value)}
                                    stroke="rgba(0,0,0,0.1)"
                                    strokeWidth="0.5"
                                    style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
                                    onMouseEnter={(e) => handleMouseEnter(e, i, j)}
                                    onMouseLeave={handleMouseLeave}
                                    onClick={(e) => handleDotClick(e, i, j)}
                                />
                            ))
                        )}
                    </g>

                    {/* Size Legend */}
                    <g transform={`translate(${leftMargin + numCols * cellSize + 20}, ${topMargin})`}>
                        <text fontSize="13" fontWeight="600" fill="var(--color-text)">log₂FC</text>
                        {[-2, -1, 0, 1, 2].map((val, i) => (
                            <g key={`legend-${val}`} transform={`translate(0, ${30 + i * 35})`}>
                                <circle
                                    cx={15}
                                    cy={0}
                                    r={getDotSize(val, maxRadius)}
                                    fill={getDotColor(val)}
                                    stroke="rgba(0,0,0,0.1)"
                                    strokeWidth="0.5"
                                />
                                <text x={40} y={4} fontSize="14" fill="var(--color-text-secondary)">
                                    {val}
                                </text>
                            </g>
                        ))}
                    </g>

                    {/* P-value color legend */}
                    {showPValueLegend && (
                        <g transform={`translate(${leftMargin}, ${topMargin + numRows * cellSize + 20})`}>
                            <text fontSize="13" fontWeight="600" fill="var(--color-text)">p-value</text>
                            {PVALUE_LEVELS.map((level, i) => {
                                const legendWidth = numCols * cellSize;
                                const swatchSpacing = legendWidth / PVALUE_LEVELS.length;
                                const swatchWidth = swatchSpacing - 5;
                                return (
                                <g key={level.label} transform={`translate(${i * swatchSpacing}, 15)`}>
                                    <rect
                                        x={0}
                                        y={0}
                                        width={swatchWidth}
                                        height={14}
                                        fill={level.color}
                                        stroke="var(--color-border)"
                                        strokeWidth="0.5"
                                    />
                                    <text x={swatchWidth / 2} y={28} fontSize="12" fill="var(--color-text-secondary)" textAnchor="middle">
                                        {level.label}
                                    </text>
                                </g>
                                );
                            })}
                        </g>
                    )}
                </svg>
            </div>

            {/* Tooltip - fixed positioning to avoid clipping by overflow containers */}
            {tooltip.visible && tooltip.content && (
                <div
                    ref={tooltipRef}
                    className="tooltip"
                    style={{
                        position: 'fixed',
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -100%)',
                        pointerEvents: tooltip.pinned ? 'auto' : 'none',
                        userSelect: tooltip.pinned ? 'text' : 'none',
                        cursor: tooltip.pinned ? 'text' : 'default',
                        zIndex: 9999,
                    }}
                >
                    <div><strong>{tooltip.content.rowLabel}</strong></div>
                    <div>Cell line: {tooltip.content.colLabel}</div>
                    <div>log₂FC: {tooltip.content.value.toFixed(3)}</div>
                    <div>p-value: {showPValueLegend ? tooltip.content.pvalue.toFixed(4) : 'None (threshold based)'}</div>
                </div>
            )}
			{Legend(selectedStudy)}
        </div>
    );
}

export default EssentialityDotMap;
