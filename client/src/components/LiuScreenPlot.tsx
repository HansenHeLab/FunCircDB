import { useMemo } from 'react';

interface LiuPlotData {
    gene: string;
    rank: number;
    score: number;
    isHighlight?: boolean;
}

interface LiuScreenPlotProps {
    data: LiuPlotData[];
    highlightGene?: string;
    width?: number;
    height?: number;
}

/**
 * LiuScreenPlot - Renders a Rank vs CDCscreen Score scatter plot
 * Matches the style of the original R Shiny application.
 */
export default function LiuScreenPlot({
    data,
    highlightGene,
    width = 800,
    height = 500
}: LiuScreenPlotProps) {
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Filters and Scales
    const cleanData = useMemo(() => {
        return data.filter(d =>
            typeof d.rank === 'number' &&
            typeof d.score === 'number' &&
            !isNaN(d.rank) &&
            !isNaN(d.score)
        ).sort((a, b) => a.rank - b.rank);
    }, [data]);

    if (cleanData.length === 0) {
        return <div className="viz-container">No data for visualization</div>;
    }

    const maxRank = Math.max(...cleanData.map(d => d.rank));
    const minScore = Math.min(...cleanData.map(d => d.score));
    const maxScore = Math.max(...cleanData.map(d => d.score));

    // Scales
    const xScale = (rank: number) => (rank / maxRank) * chartWidth;
    const yScale = (score: number) => chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;

    // Generate Trend Line (Simple Moving Average for LOESS approximation)
    const trendLine = useMemo(() => {
        const points: [number, number][] = [];
        const windowSize = 50; // Smoothness factor
        for (let i = 0; i < cleanData.length; i += 10) { // Step size
            const window = cleanData.slice(Math.max(0, i - windowSize), Math.min(cleanData.length, i + windowSize));
            if (window.length === 0) continue;
            const avgRank = window.reduce((sum, d) => sum + d.rank, 0) / window.length;
            const avgScore = window.reduce((sum, d) => sum + d.score, 0) / window.length;
            points.push([xScale(avgRank), yScale(avgScore)]);
        }
        return points;
    }, [cleanData, xScale, yScale]);

    // Trendline Path string
    const trendPath = `M ${trendLine.map(p => `${p[0]},${p[1]}`).join(' L ')}`;

    // Highlight Point
    const highlightPoint = cleanData.find(d => d.gene === highlightGene);

    return (
        <div className="viz-container">
            <h3 className="viz-title">Rank vs CDCscreen Score</h3>
            <svg width={width} height={height} style={{ overflow: 'visible', margin: '0 auto', display: 'block' }}>
                <defs>
                    <clipPath id="chart-area">
                        <rect x={0} y={0} width={chartWidth} height={chartHeight} />
                    </clipPath>
                </defs>

                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Axes lines */}
                    <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="var(--color-border)" />
                    <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="var(--color-border)" />

                    {/* X Axis Label */}
                    <text
                        x={chartWidth / 2}
                        y={chartHeight + 40}
                        textAnchor="middle"
                        fill="var(--color-text)"
                        fontSize={14}
                    >
                        Rank
                    </text>

                    {/* Y Axis Label */}
                    <text
                        x={-chartHeight / 2}
                        y={-45}
                        textAnchor="middle"
                        transform="rotate(-90)"
                        fill="var(--color-text)"
                        fontSize={14}
                    >
                        CDCscreen Score
                    </text>

                    {/* Scatter Points (Canvas optimization via simple circles? SVG for 1000 points is okay, >5k is slow) 
                        For typical screen, there might be thousands. Let's render subset or simple circles. */}
                    <g clipPath="url(#chart-area)">
                        {cleanData.map((d, i) => (
                            <circle
                                key={i}
                                cx={xScale(d.rank)}
                                cy={yScale(d.score)}
                                r={2}
                                fill="var(--color-primary)"
                                opacity={0.3}
                            />
                        ))}
                    </g>

                    {/* Trend Line */}
                    <path
                        d={trendPath}
                        fill="none"
                        stroke="var(--color-secondary)"
                        strokeWidth={3}
                    />

                    {/* Highlighted Gene */}
                    {highlightPoint && (
                        <g>
                            <circle
                                cx={xScale(highlightPoint.rank)}
                                cy={yScale(highlightPoint.score)}
                                r={8}
                                fill="red"
                                stroke="white"
                                strokeWidth={2}
                            />
                            <text
                                x={xScale(highlightPoint.rank)}
                                y={yScale(highlightPoint.score) - 15}
                                textAnchor="middle"
                                fill="red"
                                fontWeight="bold"
                                fontSize={14}
                            >
                                {highlightGene}
                            </text>
                        </g>
                    )}
                </g>
            </svg>
        </div>
    );
}
