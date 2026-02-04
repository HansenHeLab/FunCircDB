/**
 * Data Conversion Script
 * 
 * Processes JSON files exported from R and creates optimized indices
 * for fast gene search and data lookup.
 * 
 * Supports both standard JSON (small files) and JSONL (large files >500MB).
 * 
 * Usage: npm run convert-data
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATA_DIR points to /db_react/data
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directories exist
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Helper to filter out date-like patterns (Excel corruption)
function isValidGene(gene) {
    return gene && typeof gene === 'string' && !gene.match(/^\d{2}-[A-Za-z]{3}$/);
}

// Process a standard JSON file (small datasets)
function processStudy(studyId, dataPath, geneField = 'gene') {
    console.log(`Processing ${studyId}...`);

    const fullPath = path.join(DATA_DIR, dataPath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`  Warning: ${fullPath} not found, skipping.`);
        return null;
    }

    try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const genes = new Set();

        if (Array.isArray(data)) {
            data.forEach(row => {
                const gene = row[geneField];
                if (isValidGene(gene)) {
                    genes.add(gene);
                }
            });
        }

        const sortedGenes = [...genes].sort();
        console.log(`  Found ${sortedGenes.length} unique genes.`);
        return { genes: sortedGenes };
    } catch (err) {
        console.error(`  Error processing ${fullPath}:`, err.message);
        return null;
    }
}

// Process a large JSONL file (stream processing)
async function processLargeStudy(studyId, dataPath, geneField = 'gene') {
    console.log(`Processing large dataset ${studyId}...`);

    const fullPath = path.join(DATA_DIR, dataPath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`  Warning: ${fullPath} not found, skipping.`);
        return null;
    }

    const genes = new Set();
    const fileStream = fs.createReadStream(fullPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    // We will split the data into per-gene files for fast access
    // But to avoid opening thousands of file handles, we'll buffer data
    const geneBuffers = new Map(); // gene -> array of rows

    let lineCount = 0;

    for await (const line of rl) {
        try {
            const row = JSON.parse(line);
            const gene = row[geneField];

            if (isValidGene(gene)) {
                genes.add(gene);

                if (!geneBuffers.has(gene)) {
                    geneBuffers.set(gene, []);
                }
                geneBuffers.get(gene).push(row);
            }

            lineCount++;
            if (lineCount % 100000 === 0) {
                process.stdout.write(`  Processed ${lineCount} lines...\r`);
            }
        } catch (err) {
            // Ignore parse errors on individual lines
        }
    }

    console.log(`  Processed ${lineCount} lines total.`);
    console.log(`  Found ${genes.size} unique genes.`);
    console.log(`  Writing per-gene files...`);

    // Write per-gene files (e.g., /data/clinical/arul-et-al/HIPK3.json)
    const outputDir = path.join(DATA_DIR, 'clinical', 'split', studyId);
    ensureDir(outputDir);

    let itemsWritten = 0;
    for (const [gene, rows] of geneBuffers.entries()) {
        const genePath = path.join(outputDir, `${gene}.json`);
        // If file exists (stream append/overwrite?), for now just overwrite
        fs.writeFileSync(genePath, JSON.stringify(rows));
        itemsWritten++;
        if (itemsWritten % 1000 === 0) {
            process.stdout.write(`  Wrote ${itemsWritten}/${genes.size} gene files...\r`);
        }
    }

    console.log(`  Done writing per-gene files for ${studyId}.\n`);

    // Clear heavy memory
    geneBuffers.clear();

    return { genes: [...genes].sort() };
}

// Main conversion process
async function main() {
    console.log('=== FunCirc Data Conversion (Streaming) ===\n');
    console.log(`Data directory: ${DATA_DIR}\n`);

    const geneIndex = {};

    // 1. Process Small Files (Her, Chen, Li, Liu)
    // -------------------------------------------

    // Her et al.
    const herResult = processStudy('her-et-al', 'her-et-al/annotations.json', 'gene');
    if (herResult) {
        geneIndex['her-et-al'] = herResult.genes;
        const genesPath = path.join(DATA_DIR, 'her-et-al', 'genes.json');
        fs.writeFileSync(genesPath, JSON.stringify({ genes: herResult.genes }));
    }

    // Chen et al.
    const chenResult = processStudy('chen-et-al', 'chen-et-al/annotations.json', 'gene');
    if (chenResult) {
        geneIndex['chen-et-al'] = chenResult.genes;
        const genesPath = path.join(DATA_DIR, 'chen-et-al', 'genes.json');
        fs.writeFileSync(genesPath, JSON.stringify({ genes: chenResult.genes }));
    }

    // Liu et al. (per cell line)
    for (const cellLine of ['ht29', '293ft', 'hela']) {
        const result = processStudy(`liu-et-al/${cellLine}`, `liu-et-al/${cellLine}/data.json`, 'gene');
        if (result) {
            geneIndex[`liu-et-al-${cellLine}`] = result.genes;
            const genesPath = path.join(DATA_DIR, 'liu-et-al', cellLine, 'genes.json');
            fs.writeFileSync(genesPath, JSON.stringify({ genes: result.genes }));
        }
    }

    // Li et al. (per tissue type)
    for (const tissue of ['colon', 'pancreas', 'brain', 'skin']) {
        const result = processStudy(`li-et-al/${tissue}`, `li-et-al/${tissue}/data.json`, 'gene');
        if (result) {
            geneIndex[`li-et-al-${tissue}`] = result.genes;
            const genesPath = path.join(DATA_DIR, 'li-et-al', tissue, 'genes.json');
            fs.writeFileSync(genesPath, JSON.stringify({ genes: result.genes }));
        }
    }

    // 2. Process Large Files (Clinical) - STREAMING
    // ---------------------------------------------
    // Note: Expects .jsonl files. Fallback to .json if .jsonl missing, but .json will crash for large files.

    const clinicalDatasets = [
        { id: 'arul-et-al', path: 'clinical/arul-et-al.jsonl' },
        { id: 'cpcg', path: 'clinical/cpcg.jsonl' },
        { id: 'breast-cohort', path: 'clinical/breast-cohort.jsonl' },
    ];

    for (const dataset of clinicalDatasets) {
        let result = null;

        // Check for .jsonl first
        if (fs.existsSync(path.join(DATA_DIR, dataset.path))) {
            result = await processLargeStudy(dataset.id, dataset.path, 'gene');
        }
        // Fallback to .json (only if small enough)
        else if (fs.existsSync(path.join(DATA_DIR, dataset.path.replace('.jsonl', '.json')))) {
            console.log(`${dataset.path} not found, falling back to standard JSON...`);
            result = processStudy(dataset.id, dataset.path.replace('.jsonl', '.json'), 'gene');
        } else {
            console.warn(`  Warning: No data found for ${dataset.id} (checked .jsonl and .json)`);
        }

        if (result) {
            geneIndex[dataset.id] = result.genes;
            const genesPath = path.join(DATA_DIR, 'clinical', `${dataset.id}-genes.json`);
            fs.writeFileSync(genesPath, JSON.stringify({ genes: result.genes }));
            console.log(`  Wrote ${dataset.id}-genes.json with ${result.genes.length} genes.\n`);
        }
    }

    // Create global search index
    const allGenes = new Set();
    Object.values(geneIndex).forEach(genes => {
        genes.forEach(g => allGenes.add(g));
    });

    const searchIndex = {
        totalGenes: allGenes.size,
        genes: [...allGenes].sort(),
        byStudy: geneIndex,
    };

    fs.writeFileSync(
        path.join(DATA_DIR, 'gene-search-index.json'),
        JSON.stringify(searchIndex)
    );

    console.log(`\n✓ Created global search index with ${allGenes.size} unique genes.`);
    console.log('✓ Data conversion complete!');
}

main().catch(console.error);
