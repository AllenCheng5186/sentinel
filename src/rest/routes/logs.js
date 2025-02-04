// routes/logs.js
const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const router = express.Router();

// Configure multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

// Helper function to parse nginx timestamps
// Example timestamp: "08/May/2024:21:12:38 +0000"
function parseNginxTimestamp(ts) {
    const regex = /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}:\d{2}:\d{2})\s+([+\-]\d{4})/;
    const match = regex.exec(ts);
    if (match) {
        const [ , day, month, year, time, offset] = match;
        // Build a string like "08 May 2024 21:12:38 +0000"
        return new Date(`${day} ${month} ${year} ${time} ${offset}`);
    }
    return null;
}

// Regex to match a typical nginx access log line
// It captures: IP address, timestamp, request, status code, and body bytes sent.
const logLineRegex = /^(\d{1,3}(?:\.\d{1,3}){3})\s+-\s+-\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\d+)/;

router.post('/', upload.single('logfile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No log file uploaded.' });
    }

    // Read the file content as UTF-8 text.
    const fileContent = req.file.buffer.toString('utf8');
    const lines = fileContent.split('\n');

    // Variables to aggregate data.
    let totalRequests = 0;
    let totalBytes = 0;
    let errorCount = 0;
    const distinctIps = new Set();
    let minTimestamp = null;
    let maxTimestamp = null;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue; // Skip empty lines

        // Process only lines that start with an IP address
        if (!/^\d+\.\d+\.\d+\.\d+/.test(line)) continue;

        const match = logLineRegex.exec(line);
        if (match) {
            const ip = match[1];
            const timestampStr = match[2];
            const status = parseInt(match[4], 10);
            const bytes = parseInt(match[5], 10);

            const timestamp = parseNginxTimestamp(timestampStr);
            if (!timestamp) continue;

            // Update the earliest and latest timestamps
            if (!minTimestamp || timestamp < minTimestamp) {
                minTimestamp = timestamp;
            }
            if (!maxTimestamp || timestamp > maxTimestamp) {
                maxTimestamp = timestamp;
            }

            totalRequests++;
            totalBytes += bytes;
            if (status >= 400) errorCount++;
            distinctIps.add(ip);
        }
    }

    // Ensure we found valid access log entries
    if (totalRequests === 0 || !minTimestamp || !maxTimestamp) {
        return res.status(400).json({ error: 'No valid access log entries found.' });
    }

    // Calculate aggregated metrics:
    // - requests per second: total requests divided by the total time interval (in seconds)
    // - active users: number of distinct IP addresses
    // - error rate: error count divided by total requests
    const timeDiffSeconds = (maxTimestamp - minTimestamp) / 1000;
    const requestsPerSecond = timeDiffSeconds > 0 ? totalRequests / timeDiffSeconds : totalRequests;
    const activeUsers = distinctIps.size;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    // Insert the aggregated data into the metrics table.
    try {
        const result = await pool.query(
            `INSERT INTO metrics (timestamp, requests_per_second, active_users, bandwidth_usage, error_rate)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [
                minTimestamp.toISOString(),  // Using the earliest log timestamp as the record's timestamp
                requestsPerSecond,
                activeUsers,
                totalBytes,
                errorRate,
            ]
        );

        res.status(201).json({
            message: 'Log file processed and metrics recorded successfully.',
            record: result.rows[0],
        });
    } catch (err) {
        console.error('Error inserting aggregated data:', err);
        res.status(500).json({ error: 'Database error while inserting aggregated data.' });
    }
});

module.exports = router;