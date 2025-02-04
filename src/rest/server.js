// server.js
const express = require('express');
const bodyParser = require('body-parser');
const metricsRouter = require('./routes/metrics');       // Your existing metrics endpoints
const logsRouter = require('./routes/logs');             // The previous basic logs processing
const detailedMetricsRouter = require('./routes/detailedMetrics'); // New detailed metrics endpoint

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Mount endpoints
app.use('/api/metrics', metricsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/detailed_metrics', detailedMetricsRouter);

app.get('/', (req, res) => {
    res.send('Network Activity API is running.');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});