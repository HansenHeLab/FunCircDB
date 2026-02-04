import { Router } from 'express';

export const searchRouter = Router();

// In-memory gene index (loaded at startup)
let geneSearchIndex: { genes: string[]; byStudy: Record<string, string[]> } | null = null;

// Load index (would typically load from JSON file)
function loadIndex() {
    if (geneSearchIndex) return geneSearchIndex;

    // TODO: Load from file: fs.readFileSync('./data/gene-search-index.json')
    // For now, mock data
    geneSearchIndex = {
        genes: ['HIPK3', 'CDR1as', 'SMARCA5', 'ZKSCAN1', 'FAM120A', 'MYC', 'TP53', 'BRCA1'],
        byStudy: {
            'her-et-al': ['HIPK3', 'CDR1as', 'SMARCA5', 'ZKSCAN1'],
            'liu-et-al': ['HIPK3', 'CDR1as', 'FAM120A'],
            'li-et-al': ['HIPK3', 'SMARCA5', 'MYC'],
            'chen-et-al': ['HIPK3', 'CDR1as', 'TP53', 'BRCA1'],
        },
    };
    return geneSearchIndex;
}

/**
 * GET /api/genes/search
 * 
 * Typeahead search for genes across all studies or a specific study.
 * 
 * Query params:
 *   - q: Search query (required, min 2 chars)
 *   - study: Optional study ID to filter by
 *   - limit: Max results (default 50)
 */
searchRouter.get('/search', (req, res) => {
    const { q, study, limit = '50' } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({ error: 'Query "q" must be at least 2 characters.' });
    }

    const index = loadIndex();
    const maxResults = Math.min(parseInt(limit as string, 10) || 50, 200);
    const searchTerm = q.toLowerCase();

    // Get gene list based on study filter
    let genesToSearch: string[];
    if (study && typeof study === 'string' && index.byStudy[study]) {
        genesToSearch = index.byStudy[study];
    } else {
        genesToSearch = index.genes;
    }

    // Filter genes matching query
    const matches = genesToSearch
        .filter(gene => gene.toLowerCase().includes(searchTerm))
        .slice(0, maxResults);

    res.json({
        query: q,
        study: study || null,
        results: matches,
        total: matches.length,
        hasMore: matches.length === maxResults,
    });
});
