import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { studiesRouter } from './routes/studies.js';
import { clinicalRouter } from './routes/clinical.js';
import { searchRouter } from './routes/search.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());

// Routes
app.use('/api/studies', studiesRouter);
app.use('/api/clinical', clinicalRouter);
app.use('/api/genes', searchRouter);

// Health check
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 FunCirc API running on http://localhost:${PORT}`);
});
