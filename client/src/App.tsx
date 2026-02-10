import { Suspense, lazy, useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load heavy components
const HomePage = lazy(() => import('./pages/HomePage'));
const EssentialityPage = lazy(() => import('./pages/EssentialityPage'));
const ClinicalExpressionPage = lazy(() => import('./pages/ClinicalExpressionPage'));

type TabId = 'home' | 'essentiality' | 'clinical';

/* ── Scroll progress bar ─────────────────────────── */
function ScrollProgress() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const onScroll = () => {
            const el = document.documentElement;
            const scrollTop = el.scrollTop;
            const scrollHeight = el.scrollHeight - el.clientHeight;
            setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return <div className="scroll-progress" style={{ width: `${progress}%` }} />;
}

export default function App() {
    const [activeTab, setActiveTab] = useState<TabId>('home');

    return (
        <div className="app-container">
            <ScrollProgress />

            {/* Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar-logo">FunCirc</div>
                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
                        onClick={() => setActiveTab('home')}
                    >
                        <HomeIcon />
                        Home
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'essentiality' ? 'active' : ''}`}
                        onClick={() => setActiveTab('essentiality')}
                    >
                        <ChartIcon />
                        Query Essentiality
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'clinical' ? 'active' : ''}`}
                        onClick={() => setActiveTab('clinical')}
                    >
                        <ExpressionIcon />
                        Clinical Expression
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <a href="https://www.hansenhelab.org/" target="_blank" rel="noopener noreferrer">
                        He Lab @ UHN
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <ErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                        <div key={activeTab} className="page-enter">
                            {activeTab === 'home' && <HomePage />}
                            {activeTab === 'essentiality' && <EssentialityPage />}
                            {activeTab === 'clinical' && <ClinicalExpressionPage />}
                        </div>
                    </Suspense>
                </ErrorBoundary>
            </main>
        </div>
    );
}

// Simple Icon components
function HomeIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
    );
}

function ChartIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
    );
}

function ExpressionIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

