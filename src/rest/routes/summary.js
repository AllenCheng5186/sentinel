// routes/summary.js
const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// Configure PostgreSQL connection
const pool = new Pool({
    user: 'network_data_user',
    host: '192.168.22.141',
    database: 'network_data',
    password: 'HVA6yuf0rgc1mpz-fqb',
    port: 5432,
    ssl: {
        rejectUnauthorized: false  // For development only. In production, supply proper certificates.
    },
});

// GET /api/summary
router.get('/', async (req, res) => {
    const query = `
        SELECT
            COUNT(*) AS total_requests,
            COUNT(*) FILTER (WHERE status_code < 400) AS valid_requests,
                COUNT(*) FILTER (WHERE status_code >= 400) AS failed_requests,
                COUNT(*) FILTER (WHERE status_code = 404) AS not_found,
                COUNT(DISTINCT COALESCE(forwarded_ip, client_ip)) AS unique_visitors,
            COUNT(DISTINCT resource_path) AS requested_files,
            COALESCE(SUM(response_size), 0) AS total_bytes
        FROM detailed_metrics;
    `;

    try {
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.json({
                totalRequests: 0,
                validRequests: 0,
                failedRequests: 0,
                notFound: 0,
                uniqueVisitors: 0,
                requestedFiles: 0,
                totalBytes: 0
            });
        }

        const row = result.rows[0];
        res.json({
            totalRequests: Number(row.total_requests),
            validRequests: Number(row.valid_requests),
            failedRequests: Number(row.failed_requests),
            notFound: Number(row.not_found),
            uniqueVisitors: Number(row.unique_visitors),
            requestedFiles: Number(row.requested_files),
            totalBytes: String(Math.round(Number(row.total_bytes) / Math.pow(10, 6) * 100) / 100) + ' MB',
            logSize: String(Math.round(Number(row.total_requests) / Math.pow(10, 4) * 2.15 * 100) / 100) + ' MB',
        });
    } catch (err) {
        console.error('Error computing summary data:', err);
        res.status(500).json({ error: 'Database error computing summary.' });
    }
});

module.exports = router;