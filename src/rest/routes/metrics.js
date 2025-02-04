// routes/metrics.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Configure PostgreSQL connection (adjust with your credentials)
const pool = new Pool({
    user: 'network_data_user',
    host: '192.168.22.141',
    database: 'network_data',
    password: 'HVA6yuf0rgc1mpz-fqb',
    port: 5432,
});

/**
 * POST /api/metrics
 * Logs a new network activity record.
 */
router.post('/', async (req, res) => {
    const { timestamp, requestsPerSecond, activeUsers, bandwidthUsage, errorRate } = req.body;

    if (!timestamp || requestsPerSecond == null || activeUsers == null || bandwidthUsage == null || errorRate == null) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO metrics (timestamp, requests_per_second, active_users, bandwidth_usage, error_rate)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [timestamp, requestsPerSecond, activeUsers, bandwidthUsage, errorRate]
        );

        res.status(201).json({
            message: 'Network activity recorded successfully.',
            record: result.rows[0],
        });
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ error: 'Database error.' });
    }
});

/**
 * GET /api/metrics
 * Retrieves all network activity records.
 * Optionally, you could support query parameters to filter by date.
 */
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM metrics ORDER BY timestamp DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Database error.' });
    }
});

/**
 * GET /api/metrics/:id
 * Retrieves a specific network activity record by its ID.
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM metrics WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Database error.' });
    }
});

module.exports = router;