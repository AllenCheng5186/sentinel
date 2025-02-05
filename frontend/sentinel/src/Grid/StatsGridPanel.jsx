// src/Dashboard.jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import StatsGrid from './StatsGrid';

const StatsGridPanel = ({startDay, endDay}) => {
    const [summaryData, setSummaryData] = useState(null);

    useEffect(() => {
        // Example: fetch summary data on mount
        const fetchSummary = async () => {
            try {
                const res = await axios.get('http://localhost:3000/api/summary');
                setSummaryData(res.data);
            } catch (err) {
                console.error('Error fetching summary data', err);
            }
        };
        fetchSummary();
    }, []);

    return (
        <div >
            <StatsGrid summaryData={summaryData} startDay={startDay} endDay={endDay} />
        </div>
    );
};

export default StatsGridPanel;