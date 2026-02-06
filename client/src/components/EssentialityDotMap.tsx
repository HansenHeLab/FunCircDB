import { useState, useCallback, useRef } from 'react';

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
					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
						<div style={{ width: 12, height: 12, border: '1px solid #ddd', background: '#000' }}></div>
						<span>Significant (p &lt; 0.05)</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
						<div style={{ width: 12, height: 12, border: '1px solid #ddd', background: '#fff' }}></div>
						<span>Not Significant</span>
					</div>
				</>
			)}
        </div>
	)
}

// P-value color scale (black = significant, white = not significant)
function getPValueColor(pval: number): string {
    if (pval <= 0.05) {
        // Dark to medium gray for significant
        const intensity = Math.max(0, Math.min(1, (pval / 0.05)));
        const gray = Math.round(intensity * 100);
        return `rgb(${gray}, ${gray}, ${gray})`;
    }
    // Light gray to white for non-significant
    const intensity = Math.min(1, (pval - 0.05) / 0.75);
    const gray = Math.round(100 + intensity * 155);
    return `rgb(${gray}, ${gray}, ${gray})`;
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
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
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

    const handleMouseEnter = useCallback((
        e: React.MouseEvent,
        row: number,
        col: number
    ) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;

        setTooltip({
            visible: true,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - 10,
            content: {
                rowLabel: rowLabels[row],
                colLabel: colLabels[col],
                value: data.values[row][col],
                pvalue: data.pvalues[row][col],
            },
        });
    }, [rowLabels, colLabels, data]);

    const handleMouseLeave = useCallback(() => {
        setTooltip(prev => ({ ...prev, visible: false }));
    }, []);

    const handleClick = useCallback((row: number, col: number) => {
        if (onCellClick) {
            onCellClick(row, col, data.values[row][col], data.pvalues[row][col]);
        }
    }, [onCellClick, data]);

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
                            fontSize="16"
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
                            fontSize="11"
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
                            fontSize="11"
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
                                    onClick={() => handleClick(i, j)}
                                />
                            ))
                        )}
                    </g>

                    {/* Size Legend */}
                    <g transform={`translate(${leftMargin + numCols * cellSize + 20}, ${topMargin})`}>
                        <text fontSize="11" fontWeight="600" fill="var(--color-text)">log₂FC</text>
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
                                <text x={40} y={4} fontSize="10" fill="var(--color-text-secondary)">
                                    {val}
                                </text>
                            </g>
                        ))}
                    </g>

                    {/* P-value color legend */}
                    {showPValueLegend && (
                        <g transform={`translate(${leftMargin}, ${topMargin + numRows * cellSize + 20})`}>
                            <text fontSize="11" fontWeight="600" fill="var(--color-text)">p-value</text>
                            <defs>
                                <linearGradient id="pval-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={getPValueColor(0)} />
                                    <stop offset="25%" stopColor={getPValueColor(0.05)} />
                                    <stop offset="100%" stopColor={getPValueColor(1)} />
                                </linearGradient>
                            </defs>
                            <rect
                                x={0}
                                y={15}
                                width={150}
                                height={12}
                                fill="url(#pval-gradient)"
                                stroke="var(--color-border)"
                                strokeWidth="0.5"
                            />
                            <text x={0} y={38} fontSize="9" fill="var(--color-text-secondary)">0</text>
                            <text x={35} y={38} fontSize="9" fill="var(--color-text-secondary)">0.05</text>
                            <text x={145} y={38} fontSize="9" fill="var(--color-text-secondary)" textAnchor="end">1</text>
                        </g>
                    )}
                </svg>
            </div>

            {/* Tooltip */}
            {tooltip.visible && tooltip.content && (
                <div
                    className="tooltip"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translate(-50%, -100%)',
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
