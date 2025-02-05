// src/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
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
import StatsGridPanel from "./Grid/StatsGridPanel.jsx";
import IpRankChart from "./ipRank.jsx";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

function toYYYYMMDD(dateObj) {
  const year = dateObj.getFullYear();

  // getMonth() is zero-based, so we add 1
  let month = dateObj.getMonth() + 1;
  // Pad month with 0 if necessary
  if (month < 10) month = '0' + month;

  let day = dateObj.getDate();
  // Pad day with 0 if necessary
  if (day < 10) day = '0' + day;

  return `${year}-${month}-${day}`;
}

/*
  This component:
  1) Fetches date ranges from /api/date_ranges to populate dropdowns for "startDay" and "endDay".
  2) Fetches data from /api/aggregated_metrics?start=...&end=... to get per-second data.
  3) Displays four separate Line charts, each with the same x-axis (timestamps) but different y-axis data (requests, active_users, bandwidth_usage, error_rate).
*/

const Dashboard = () => {
  const [availableDays, setAvailableDays] = useState([]);
  const [startDay, setStartDay] = useState(null);
  const [endDay, setEndDay] = useState(null);
  const [requestsData, setRequestsData] = useState(null);
  const [activeUsersData, setActiveUsersData] = useState(null);
  const [bandwidthData, setBandwidthData] = useState(null);
  const [errorRateData, setErrorRateData] = useState(null);
  const [labels, setLabels] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [interval, setInterval] = useState('minute');
  const [validDates, setValidDates] = useState([]);

  function formatLabel(ts, interval) {
    const dateObj = new Date(ts);
    if (interval === 'day') {
      // show just the date, e.g. "5/23/2024"
      return dateObj.toLocaleDateString();
    } else {
      // for second/minute/hour intervals, show time or date+time
      return dateObj.toLocaleTimeString();
    }
  }



  // Fetch the distinct days from /api/date_ranges
  const fetchDateRanges = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/date_ranges');
      const days = res.data.days; // e.g. ["2024-05-01", "2024-05-02", ...]
      setAvailableDays(days);

      const converted = days.map(dayStr => {
        // dayStr might be "2024-05-01"
        // parse into a Date object
        return new Date(`${dayStr}T00:00:00`);
      });
      setValidDates(converted.sort((a, b) => a - b));

      if (converted.length > 0) {
        // Optionally set default range to the first and last day in the list
        setStartDay(converted[0]);
        setDateStart(days[0]);

        setEndDay(converted[0]);
        setDateEnd(days[days.length - 1]);
      }
    } catch (err) {
      console.error('Error fetching date ranges:', err);
    }
  };

  // Fetch aggregated metrics from /api/aggregated_metrics?start=...&end=...
  const fetchMetrics = async () => {
    if (!startDay || !endDay) return; // Need both
    try {
      const request_start_day = toYYYYMMDD(startDay);
      const request_end_day = toYYYYMMDD(endDay);

      const url = `http://localhost:3000/api/aggregated_metrics?start=${request_start_day}&end=${request_end_day}&interval=${interval}`;
      const res = await axios.get(url);
      const data = res.data.data; // array of { timestamp, requests, active_users, bandwidth_usage, error_rate }
      // Sort by timestamp if not already sorted
      data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Prepare a shared labels array for the x-axis
      // const timeLabels = data.map(d => new Date(d.timestamp).toLocaleTimeString());
      const labels = data.map(item => formatLabel(item.timestamp, interval));

      setLabels(labels);

      setRequestsData(data.map(d => d.requests));
      setActiveUsersData(data.map(d => d.active_users));
      setBandwidthData(data.map(d => d.bandwidth_usage));
      setErrorRateData(data.map(d => d.error_rate));
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line
  }, [startDay, endDay, interval]);

  // On mount, fetch available days
  useEffect(() => {
    fetchDateRanges();
  }, []);

  // Whenever startDay or endDay changes, fetch new data
  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line
  }, [startDay, endDay]);

  // For convenience, define a chart options object
  const chartOptions = {
    responsive: true,
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10, // display at most 10 labels
          source: 'auto',
        },
      },
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: { position: 'top' },
      decimation: {
        enabled: true,
        algorithm: "lttb",
        samples: 50
      },
    },
  };

  // Build separate chart data objects for each metric
  const requestsChartData = {
    labels,
    datasets: [
      {
        label: 'Requests',
        data: requestsData || [],
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const activeUsersChartData = {
    labels,
    datasets: [
      {
        label: 'Active Users',
        data: activeUsersData || [],
        borderColor: 'rgba(153,102,255,1)',
        backgroundColor: 'rgba(153,102,255,0.2)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const bandwidthChartData = {
    labels,
    datasets: [
      {
        label: 'Bandwidth Usage (bytes)',
        data: bandwidthData || [],
        borderColor: 'rgba(255,159,64,1)',
        backgroundColor: 'rgba(255,159,64,0.2)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const errorRateChartData = {
    labels,
    datasets: [
      {
        label: 'Error Rate',
        data: errorRateData || [],
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const handleStartChange = (date) => {
    // ensure user can't pick start date after end date
    if (endDay && date > endDay) {
      setEndDay(date);
    }
    setStartDay(date);
  };

  const handleEndChange = (date) => {
    // ensure endDate >= startDate
    if (startDay && date < startDay) {
      setStartDay(date);
    }
    setEndDay(date);
  };

  function formatLabel(timestamp) {
    const d = new Date(timestamp);
    if (interval === 'day') {
      return d.toLocaleDateString(); // e.g. "5/23/2024"
    } else {
      return d.toLocaleTimeString(); // e.g. "12:15:32 PM"
    }
  }

  return (
      <div className="dashboard">
        <h1>Sentinel Dashboard</h1>
        <StatsGridPanel startDay={dateStart} endDay={dateEnd}/>

        <div className="date-selection">

          <div className="date-picker">
            {/* Start Date Picker */}
            <div>
              <label >Start Date: </label>
              <DatePicker
                  selected={startDay}
                  onChange={handleStartChange}
                  includeDates={validDates}       // Only allow valid days
                  placeholderText="Select start date"
                  dateFormat="yyyy-MM-dd"
              />
            </div>

            {/* End Date Picker */}
            <div>
              <label>End Date: </label>
              <DatePicker
                  selected={endDay}
                  onChange={handleEndChange}
                  includeDates={validDates}       // Only allow valid days
                  placeholderText="Select end date"
                  dateFormat="yyyy-MM-dd"
                  set minDate={startDay}
              />
            </div>

            {/* Interval dropdown */}
            <div className="date-picker">
              <label>Interval: </label>
              <select value={interval} onChange={e => setInterval(e.target.value)}>
                <option value="second">Second</option>
                <option value="minute">Minute</option>
                <option value="hour">Hour</option>
                <option value="day">Day</option>
              </select>
            </div>
          </div>

        </div>

        {/* Render the 4 separate charts */}
        <div className="charts-grid">
          {/* Requests Chart */}
          <div className="chart-card">
            <h3>Requests</h3>
            <Line data={requestsChartData} options={chartOptions} />
          </div>

          {/* Active Users Chart */}
          <div className="chart-card">
            <h3>Active Users</h3>
            <Line data={activeUsersChartData} options={chartOptions} />
          </div>

          {/* Bandwidth Chart */}
          <div className="chart-card">
            <h3>Bandwidth Usage (bytes)</h3>
            <Line data={bandwidthChartData} options={chartOptions} />
          </div>

          {/* Error Rate Chart */}
          <div className="chart-card">
            <h3>Error Rate</h3>
            <Line data={errorRateChartData} options={chartOptions} />
          </div>

          <div className="chart-card">
            <h3>Top 10 IPs</h3>
            <div className="ip-rank-chart">
              <IpRankChart />
            </div>
          </div>
        </div>
      </div>
  );
};

export default Dashboard;