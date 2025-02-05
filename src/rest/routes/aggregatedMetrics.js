// routes/aggregatedMetrics.js
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

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
  GET /api/aggregated_metrics?start=YYYY-MM-DD&end=YYYY-MM-DD
  Groups data by second and returns the time-series data for that range.
  If start/end are not provided, returns all data.
*/
router.get('/', async (req, res) => {
    const { start, end } = req.query;
    const interval = req.query.interval || 'minute'; // default to minute

    // Ensure it's a safe option
    const validIntervals = ['second','minute','hour','day'];
    const chosen = validIntervals.includes(interval) ? interval : 'minute';


    // Prepare the base query
    let query = `
        SELECT
            date_trunc('${chosen}', request_timestamp) AS ts,
            COUNT(*) AS requests,
            COUNT(DISTINCT client_ip) AS active_users,
            SUM(response_size) AS bandwidth_usage,
            CASE WHEN COUNT(*) > 0
                THEN COUNT(*) FILTER (WHERE status_code >= 400)::float / COUNT(*)
                ELSE 0
            END AS error_rate
        FROM detailed_metrics
  `;

    // Optional WHERE clause if date range is provided
    const params = [];
    if (start && end) {
        query += ` WHERE request_timestamp BETWEEN $1 AND $2 `;
        // Convert 'YYYY-MM-DD' to a full timestamp range if you want entire day
        // e.g., 'YYYY-MM-DD 00:00:00' up to 'YYYY-MM-DD 23:59:59'
        params.push(`${start} 00:00:00`, `${end} 23:59:59`);
    }

    query += `
    GROUP BY ts
    ORDER BY ts;
  `;

    try {
        const result = await pool.query(query, params);
        const data = result.rows.map(row => ({
            timestamp: row.ts.toISOString(),
            requests: Number(row.requests),
            active_users: Number(row.active_users),
            bandwidth_usage: Number(row.bandwidth_usage),
            error_rate: Number(row.error_rate)
        }));
        res.json({ data });
    } catch (err) {
        console.error('Error fetching aggregated metrics by date range:', err);
        res.status(500).json({ error: 'Database error.' });
    }
});

module.exports = router;