// server.js
const express = require('express');
const bodyParser = require('body-parser');
const metricsRouter = require('./routes/metrics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Mount the metrics router under /api/metrics
app.use('/api/metrics', metricsRouter);

// Basic route for health-check
app.get('/', (req, res) => {
    res.send('Network Activity API is running.');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});