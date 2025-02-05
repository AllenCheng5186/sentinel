// routes/dateRanges.js
const { Pool } = require('pg');
const express = require('express');
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
  GET /api/date_ranges
  Returns an array of distinct dates (YYYY-MM-DD) found in the request_timestamp column.
*/
router.get('/', async (req, res) => {
    const query = `
    SELECT DISTINCT
      TO_CHAR(request_timestamp, 'YYYY-MM-DD') AS log_date
    FROM detailed_metrics
    ORDER BY log_date;
  `;

    try {
        const result = await pool.query(query);
        const days = result.rows.map(row => row.log_date);
        res.json({ days });
    } catch (err) {
        console.error('Error fetching date ranges:', err);
        res.status(500).json({ error: 'Database error fetching date ranges.' });
    }
});

module.exports = router;