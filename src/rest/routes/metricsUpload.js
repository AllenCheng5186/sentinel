// routes/metricsUpload.js
const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const router = express.Router();

// Configure Multer for in-memory storage.
const storage = multer.memoryStorage();
const upload = multer({ storage });

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
// Helper function to parse an Nginx timestamp string.
// Expected format: "08/May/2024:21:16:34 +0000"
function parseNginxTimestamp(ts) {
    const regex = /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}:\d{2}:\d{2})\s+([+\-]\d{4})/;
    const match = regex.exec(ts);
    if (match) {
        const [ , day, month, year, time, offset ] = match;
        return new Date(`${day} ${month} ${year} ${time} ${offset}`);
    }
    return null;
}

// Regular expression to match a typical Nginx access log line.
// Expected format (with quotes around the request line, user agent, and forwarded IP):
//   client_ip - - [timestamp] "HTTP_METHOD RESOURCE_PATH HTTP_VERSION" status_code response_size "user_agent" "forwarded_ip"
const logRegex = /^(\d{1,3}(?:\.\d{1,3}){3})\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)(?:\s+\S+)?"\s+(\d{3})\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"/;

router.post('/', upload.single('logfile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No log file uploaded.' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    const lines = fileContent.split('\n');

    // Aggregation variables
    let totalRequests = 0;
    let totalResponseSize = 0;
    let errorCount = 0;
    const uniqueIPs = new Set();
    let earliestTimestamp = null;
    let latestTimestamp = null;

    // Process each line in the file.
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        // Process only lines that start with an IP address (ignore notices/errors).
        if (!/^\d+\.\d+\.\d+\.\d+/.test(line)) continue;

        const match = logRegex.exec(line);
        if (!match) {
            // Skip lines that do not match the expected access log format.
            continue;
        }

        // Extract fields from the matched groups.
        const clientIp = match[1];
        const timestampStr = match[2];
        // (The HTTP method and resource path are captured below but not used in aggregation.)
        const httpMethod = match[3];
        const resourcePath = match[4];
        const statusCode = parseInt(match[5], 10);
        const responseSize = parseInt(match[6], 10);
        // User-agent and forwarded IP are available but not used here.
        // const userAgent = match[7];
        // const forwardedIp = match[8];

        const requestTimestamp = parseNginxTimestamp(timestampStr);
        if (!requestTimestamp) continue;

        totalRequests++;
        totalResponseSize += responseSize;
        uniqueIPs.add(clientIp);
        if (statusCode >= 400) {
            errorCount++;
        }

        if (!earliestTimestamp || requestTimestamp < earliestTimestamp) {
            earliestTimestamp = requestTimestamp;
        }
        if (!latestTimestamp || requestTimestamp > latestTimestamp) {
            latestTimestamp = requestTimestamp;
        }
    }

    // Ensure that we have at least one valid log entry.
    if (totalRequests === 0 || !earliestTimestamp || !latestTimestamp) {
        return res.status(400).json({ error: 'No valid log entries found.' });
    }

    // Calculate the total time interval in seconds.
    const timeDiffSec = (latestTimestamp - earliestTimestamp) / 1000;
    // Compute requests per second (rounding to the nearest integer).
    const requestsPerSecond = timeDiffSec > 0 ? Math.round(totalRequests / timeDiffSec) : totalRequests;
    const activeUsers = uniqueIPs.size;
    const bandwidthUsage = totalResponseSize;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    // Insert the aggregated metrics into the "metrics" table.
    try {
        const result = await pool.query(
            `INSERT INTO metrics 
       (timestamp, requests_per_second, active_users, bandwidth_usage, error_rate)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [
                earliestTimestamp.toISOString(), // you may also choose new Date().toISOString()
                requestsPerSecond,
                activeUsers,
                bandwidthUsage,
                errorRate
            ]
        );

        res.status(201).json({
            message: `Processed file. Aggregated ${totalRequests} valid log entries.`,
            metrics: result.rows[0]
        });
    } catch (err) {
        console.error('Error inserting aggregated metrics:', err);
        res.status(500).json({ error: 'Database error while inserting metrics.', details: err.message });
    }
});

module.exports = router;