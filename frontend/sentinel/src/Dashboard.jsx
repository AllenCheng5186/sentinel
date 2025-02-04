// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import './Dashboard.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components.
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [aggregatedData, setAggregatedData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch aggregated metrics from the backend.
  const fetchMetrics = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/aggregated_metrics');
      const data = res.data.data;
      // Sort data by timestamp if not already sorted.
      data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setAggregatedData(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching aggregated metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics(); // initial fetch
    const intervalId = setInterval(fetchMetrics, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Create common labels based on timestamps.
  const labels = aggregatedData.map(item =>
    new Date(item.timestamp).toLocaleTimeString()
  );

  // Chart common options.
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  // Prepare chart data for each metric.
  const requestsChartData = {
    labels,
    datasets: [
      {
        label: 'Requests per Second',
        data: aggregatedData.map(item => item.requests),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: false,
        tension: 0.1,
      },
    ],
  };

  const activeUsersChartData = {
    labels,
    datasets: [
      {
        label: 'Active Users',
        data: aggregatedData.map(item => item.active_users),
        borderColor: 'rgba(153,102,255,1)',
        backgroundColor: 'rgba(153,102,255,0.2)',
        fill: false,
        tension: 0.1,
      },
    ],
  };

  const bandwidthChartData = {
    labels,
    datasets: [
      {
        label: 'Bandwidth Usage (bytes)',
        data: aggregatedData.map(item => item.bandwidth_usage),
        borderColor: 'rgba(255,159,64,1)',
        backgroundColor: 'rgba(255,159,64,0.2)',
        fill: false,
        tension: 0.1,
      },
    ],
  };

  const errorRateChartData = {
    labels,
    datasets: [
      {
        label: 'Error Rate',
        data: aggregatedData.map(item => item.error_rate),
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)',
        fill: false,
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Network Activity Dashboard</h1>
      <p className="dashboard-updated">
        Last Updated: {lastUpdated || 'Loading...'}
      </p>
      {aggregatedData.length > 0 ? (
        <div className="charts-wrapper">
          <div className="chart-container">
            <h2>Requests per Second</h2>
            <Line data={requestsChartData} options={chartOptions} />
          </div>
          <div className="chart-container">
            <h2>Active Users</h2>
            <Line data={activeUsersChartData} options={chartOptions} />
          </div>
          <div className="chart-container">
            <h2>Bandwidth Usage (bytes)</h2>
            <Line data={bandwidthChartData} options={chartOptions} />
          </div>
          <div className="chart-container">
            <h2>Error Rate</h2>
            <Line data={errorRateChartData} options={chartOptions} />
          </div>
        </div>
      ) : (
        <p>No data available.</p>
      )}
    </div>
  );
};

export default Dashboard;