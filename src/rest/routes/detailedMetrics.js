// routes/detailedMetrics.js
const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const router = express.Router();

// Configure Multer for in-memory file uploads.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configure PostgreSQL connection (adjust as needed).
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

// Regex for a valid IPv4 address.
const ipv4Regex = /^(\d{1,3}(?:\.\d{1,3}){3})$/;

// Regex to match a typical Nginx access log line with an extra field.
// Expected format:
//   client_ip - - [timestamp] "HTTP_METHOD RESOURCE_PATH [HTTP_VERSION]" status_code response_size "user_agent" "forwarded_ip"
// const logRegex = /^(\d{1,3}(?:\.\d{1,3}){3})\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)(?:\s+\S+)?\"\s+(\d{3})\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"\s+"([^"]*)"/;
const logRegex = /^(\d{1,3}(?:\.\d{1,3}){3})\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)(?:\s+\S+)?\"\s+(\d{3})\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"\s+"([^"]*)"/;

router.post('/', upload.single('logfile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No log file uploaded.' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    const lines = fileContent.split('\n');

    let insertedCount = 0;
    let errors = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Process only lines that start with an IP address.
        if (!/^\d+\.\d+\.\d+\.\d+/.test(line)) continue;

        const match = logRegex.exec(line);
        if (!match) {
            // Optionally log the non-matching line.
            // console.warn('Log line did not match expected format:', line);
            continue;
        }

        const clientIp = match[1];
        const remoteName  = match[2];
        const authUser    = match[3];
        const timestampStr = match[4];
        const httpMethod = match[5];
        const resourcePath = match[6];
        const statusCode = parseInt(match[7], 10);
        const responseSize = parseInt(match[8], 10);
        const userAgent = match[10];
        let forwardedIp = match[11];

        // Validate the forwarded IP field.
        // If it does not match an IPv4 address (or is "-"), set it to null.
        if (!ipv4Regex.test(forwardedIp)) {
            forwardedIp = null;
        }

        const requestTimestamp = parseNginxTimestamp(timestampStr);
        if (!requestTimestamp) continue; // Skip if timestamp parsing fails.

        try {
            await pool.query(
                `INSERT INTO detailed_metrics 
         (client_ip, request_timestamp, http_method, resource_path, status_code, response_size, user_agent, forwarded_ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    clientIp,
                    requestTimestamp.toISOString(), // ISO string for TIMESTAMPTZ.
                    httpMethod,
                    resourcePath,
                    statusCode,
                    responseSize,
                    userAgent,
                    forwardedIp
                ]
            );
            insertedCount++;
        } catch (err) {
            // console.error('Error inserting log entry:', err);
            errors.push({ line, error: err.message });
        }
    }

    res.status(201).json({ message: `Processed file. Inserted ${insertedCount} entries.`, errors });
});

module.exports = router;