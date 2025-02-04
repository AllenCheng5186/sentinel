// routes/aggregatedMetrics.js
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Configure PostgreSQL connection (adjust credentials as needed)
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
/*
  GET /api/aggregated_metrics

  This endpoint groups the data in the detailed_metrics table by second.
  It calculates for each second:
    - requests: Total number of requests (log entries)
    - active_users: Count of distinct client_ip values
    - bandwidth_usage: Sum of response_size values
    - error_rate: Fraction of requests with status_code >= 400

  The data is ordered by timestamp.
*/
router.get('/', async (req, res) => {
    const query = `
        SELECT
            date_trunc('second', request_timestamp) AS ts,
            COUNT(*) AS requests,
            COUNT(DISTINCT client_ip) AS active_users,
            SUM(response_size) AS bandwidth_usage,
            CASE WHEN COUNT(*) > 0
                     THEN COUNT(CASE WHEN status_code >= 400 THEN 1 END)::float / COUNT(*) 
           ELSE 0
        END AS error_rate
    FROM detailed_metrics
    GROUP BY ts
    ORDER BY ts;
    `;

    try {
        const result = await pool.query(query);
        // Map the rows to a friendly JSON structure.
        const data = result.rows.map(row => ({
            timestamp: row.ts.toISOString(),
            requests: Number(row.requests),
            active_users: Number(row.active_users),
            bandwidth_usage: Number(row.bandwidth_usage),
            error_rate: Number(row.error_rate)
        }));

        res.json({ data });
    } catch (err) {
        console.error('Error fetching per-second aggregated metrics:', err);
        res.status(500).json({ error: 'Database error while fetching aggregated metrics.' });
    }
});

module.exports = router;