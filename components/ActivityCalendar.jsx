'use client';

import { useState } from 'react';
import { ResponsiveTimeRange } from '@nivo/calendar';
import styles from '../styles/Dashboard.module.css';

export default function ActivityCalendar({ data }) {
    const years = Object.keys(data).sort((a, b) => b - a);
    const [activeYear, setActiveYear] = useState(years[0]);

    if (!data || years.length === 0) {
        return <div className={styles.emptyChartMessage}>No calendar data available.</div>;
    }

    return (
        // This outer container will now be a flex column.
        <div className={styles.calendarContainer}>
            <div className={styles.tabNav}>
                {years.map(year => (
                    <button key={year} onClick={() => setActiveYear(year)} className={activeYear === year ? styles.activeTab : ''}>
                        {year}
                    </button>
                ))}
            </div>
            {/* This new wrapper will grow to fill the remaining space, giving the chart a height. */}
            <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveTimeRange
                    data={data[activeYear]}
                    from={`${activeYear}-01-01`}
                    to={`${activeYear}-12-31`}
                    emptyColor="#2e2e2e"
                    colors={['#61cdbb', '#97e3d5', '#e8c1a0', '#f47560']}
                    margin={{ top: 20, right: 40, bottom: 0, left: 40 }}
                    dayBorderWidth={2}
                    dayBorderColor="#1e1e1e"
                    theme={{
                        tooltip: { container: { background: '#333', color: '#fff' } },
                        legends: { text: { fill: '#fff' } },
                        labels: { text: { fill: '#ccc' } }
                    }}
                />
            </div>
        </div>
    );
}