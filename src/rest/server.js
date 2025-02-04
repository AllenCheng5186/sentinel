// server.js
const express = require('express');
const bodyParser = require('body-parser');
const metricsRouter = require('./routes/metrics');
const logsRouter = require('./routes/logs');
const detailedMetricsRouter = require('./routes/detailedMetrics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Mount endpoints
app.use('/api/metrics', metricsRouter);     // directly insert the data
app.use('/api/logs', logsRouter);           // calculate from the data
app.use('/api/detailed_metrics', detailedMetricsRouter); // add data to DB

app.get('/', (req, res) => {
    res.send('Network Activity API is running.');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});