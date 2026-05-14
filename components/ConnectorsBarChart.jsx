'use client';

import { useState, useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import styles from '../styles/Dashboard.module.css';

export default function ConnectorsBarChart({ data, moodMeta = [] }) {
    const [activeTab, setActiveTab] = useState('activities');
    const chartData = useMemo(() => data[activeTab] || [], [activeTab, data]);

    const moodColors = useMemo(() => {
        const colors = {};
        moodMeta.forEach(m => colors[m.name] = m.color);
        return colors;
    }, [moodMeta]);

    const moodKeys = useMemo(() => moodMeta.map(m => m.name), [moodMeta]);
    const getColor = (bar) => moodColors[bar.id];

    if (chartData.length === 0) {
        return <div className={styles.emptyChartMessage}>No data available for this category.</div>;
    }

    return (
        <div>
            <div className={styles.tabNav}>
                <button onClick={() => setActiveTab('activities')} className={activeTab === 'activities' ? styles.activeTab : ''}>Activities</button>
                <button onClick={() => setActiveTab('people')} className={activeTab === 'people' ? styles.activeTab : ''}>People</button>
                <button onClick={() => setActiveTab('places')} className={activeTab === 'places' ? styles.activeTab : ''}>Places</button>
            </div>
            <div style={{ height: `${Math.max(300, chartData.length * 50)}px` }}>
                <ResponsiveBar
                    data={chartData}
                    keys={moodKeys}
                    indexBy="tag"
                    margin={{ top: 24, right: 24, bottom: 64, left: 180 }}
                    padding={0.3}
                    layout="horizontal"
                    valueScale={{ type: 'linear' }}
                    indexScale={{ type: 'band', round: true }}
                    colors={getColor}
                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legendPosition: 'middle', legendOffset: 32 }}
                    axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0 }}
                    enableGridY={false}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                    legends={[{
                        anchor: 'bottom',
                        direction: 'row',
                        justify: false,
                        translateX: 0,
                        translateY: 64,
                        itemsSpacing: 0,
                        itemDirection: 'left-to-right',
                        itemWidth: 80,
                        itemHeight: 20,
                        itemOpacity: 0.75,
                        symbolSize: 12,
                        symbolShape: 'circle',
                        effects: [{ on: 'hover', style: { itemOpacity: 1 } }]
                    }]} theme={{ tooltip: { container: { background: '#333', color: '#fff', whiteSpace: 'nowrap' } }, legends: { text: { fill: '#fff' } }, axis: { ticks: { text: { fill: '#ccc', fontSize: 12 } }, legend: { text: { fill: '#fff', fontSize: 12 } } } }}
                />
            </div>
        </div>
    );
}