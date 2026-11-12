import { Router } from 'express';
import type { Pool } from 'pg';

// Public, fictional fixtures only. Never store real patient data in this table.
export function createSampleDataRouter(pool: Pool) {
    const router = Router();
    router.use((_req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        next();
    });
    router.get('/:section', async (req, res) => {
        const section = req.params.section;
        if (!['medications', 'providers', 'vitals'].includes(section)) {
            res.status(404).json({ error: 'Unknown sample section.' });
            return;
        }
        try {
            const result = await pool.query(
                'SELECT payload FROM ez_sample_payloads WHERE section = $1', [section],
            );
            if (!result.rows.length) {
                res.status(503).json({ error: 'Sample data is missing. Run database/seed-sample-mode.sql.' });
                return;
            }
            res.json({
                ...result.rows[0].payload,
                source: 'Sample Data Mode — fictional local database records',
                fetchedAt: new Date().toISOString(),
                expiresAt: Date.now() + 30 * 60 * 1000,
            });
        } catch (error) {
            console.error('Sample data lookup failed:', error instanceof Error ? error.message : 'Unknown error');
            res.status(503).json({ error: 'Sample data is unavailable. Check PostgreSQL and run database/seed-sample-mode.sql.' });
        }
    });
    return router;
}