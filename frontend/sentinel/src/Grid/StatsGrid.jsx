// src/StatsGrid.jsx
import './StatsGrid.css';

// A simple stat card that displays a title and a value
const StatCard = ({ title, value, color }) => {
    return (
        <div className="stat-card" style={{ borderTopColor: color }}>
            <div className="stat-card-title">{title}</div>
            <div className="stat-card-value">{value}</div>
        </div>
    );
};

/*
  Example usage:
    <StatsGrid summaryData={summaryData} />

  Expect summaryData to be an object like:
    {
      totalRequests: 6492967,
      validRequests: 2123492,
      failedRequests: 11,
      referrers: 3547,
      notFound: 1164,
      uniqueVisitors: 149841,
      requestedFiles: 13653,
      txAmount: '33.95 GiB',
      logSize: '105.05 MiB',
      ...
    }
*/
const StatsGrid = ({ summaryData, startDay, endDay }) => {
    if (!summaryData) {
        return <p>No summary data available.</p>;
    }

    return (
        <div className="stats-grid-container">
            <div className="stat-panel-header">
                <h2 className="stat-panel-title">Overall Analyzed Requests</h2>
                <h2 className='stat-panel-title'>{startDay} - {endDay}</h2>
            </div>
            <div className="stats-grid">
                <StatCard
                    title="Total Requests"
                    value={summaryData.totalRequests?.toLocaleString() ?? '0'}
                    color="#000000"
                />
                <StatCard
                    title="Valid Requests"
                    value={summaryData.validRequests?.toLocaleString() ?? '0'}
                    color="#2ecc71"
                />
                <StatCard
                    title="Failed Requests"
                    value={summaryData.failedRequests?.toLocaleString() ?? '0'}
                    color="#e74c3c"
                />
                <StatCard
                    title="Not Found"
                    value={summaryData.notFound?.toLocaleString() ?? '0'}
                    color="#bdc3c7"
                />
                <StatCard
                    title="Unique Visitors"
                    value={summaryData.uniqueVisitors?.toLocaleString() ?? '0'}
                    color="#1abc9c"
                />
                <StatCard
                    title="Requested Files"
                    value={summaryData.requestedFiles?.toLocaleString() ?? '0'}
                    color="#95a5a6"
                />
                <StatCard
                    title="Tx. Amount"
                    value={summaryData.totalBytes?.toLocaleString() ?? '0'}
                    color="#3498db"
                />
                <StatCard
                    title="Log Size"
                    value={summaryData.logSize ?? '0'}
                    color="#34495e"
                />
            </div>
        </div>
    );
};

export default StatsGrid;