// src/IpRankChart.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const IpRankChart = () => {
    const [ipData, setIpData] = useState([]);

    // Fetch top IPs from the backend
    const fetchIpRank = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/ip_rank');
            setIpData(res.data.data);
        } catch (err) {
            console.error('Error fetching IP rank data:', err);
        }
    };

    useEffect(() => {
        fetchIpRank();
    }, []);

    // Build chart labels (array of IP strings)
    const labels = ipData.map(item => item.real_ip);

    // Datasets: one for "good requests", one for "bad requests"
    const goodRequests = ipData.map(item => item.good_requests);
    const badRequests = ipData.map(item => item.bad_requests);

    const data = {
        labels,
        datasets: [
            {
                label: 'Good Requests',
                data: goodRequests,
                backgroundColor: 'rgba(54, 162, 235, 0.8)' // e.g. bluish
            },
            {
                label: 'Bad Requests',
                data: badRequests,
                backgroundColor: 'rgba(255, 99, 132, 0.8)' // e.g. reddish
            }
        ]
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Top IPs by Requests (Stacked)' },
        },
        scales: {
            x: {
                stacked: true  // enable stacked bar on x axis
            },
            y: {
                stacked: true, // enable stacked bar on y axis
                beginAtZero: true
            }
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <Bar data={data} options={options} />
        </div>
    );
};

export default IpRankChart;