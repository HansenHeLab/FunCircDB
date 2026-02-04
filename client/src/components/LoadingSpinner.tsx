export function LoadingSpinner() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '3rem'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
    return (
        <div style={{ marginTop: 'var(--spacing-md)' }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: '2rem', flex: 1 }} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                    {Array.from({ length: cols }).map((_, j) => (
                        <div key={j} className="skeleton skeleton-row" style={{ flex: 1 }} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function DotMapSkeleton() {
    return (
        <div className="viz-container">
            <div className="skeleton" style={{ width: '200px', height: '1.5rem', marginBottom: 'var(--spacing-md)' }} />
            <div className="skeleton" style={{ width: '100%', height: '300px' }} />
        </div>
    );
}
