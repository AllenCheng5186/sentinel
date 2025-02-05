// routes/ipRank.js
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

// GET /api/ip_rank
// Returns top IPs by total requests, plus how many are good vs. bad.
router.get('/', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    const query = `
    SELECT
      COALESCE(forwarded_ip, client_ip) AS real_ip,
      COUNT(*) AS total_requests,
      COUNT(*) FILTER (WHERE status_code < 400) AS good_requests,
      COUNT(*) FILTER (WHERE status_code >= 400) AS bad_requests
    FROM detailed_metrics
    GROUP BY real_ip
    ORDER BY total_requests DESC
    LIMIT $1;
  `;

    try {
        const result = await pool.query(query, [limit]);
        const data = result.rows.map(row => ({
            real_ip: row.real_ip,
            total_requests: Number(row.total_requests),
            good_requests: Number(row.good_requests),
            bad_requests: Number(row.bad_requests)
        }));
        res.json({ data });
    } catch (err) {
        console.error('Error fetching IP rank data:', err);
        res.status(500).json({ error: 'Database error.' });
    }
});

module.exports = router;