'use client';

import { useState, useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import styles from '../styles/Dashboard.module.css';

const moodColors = { Happy: '#FDD655', Chill: '#5DADEC', Tired: '#FF893F', Stress: '#FF4B4B' };
const getColor = (bar) => moodColors[bar.id];

export default function ConnectorsBarChart({ data }) {
    const [activeTab, setActiveTab] = useState('activities');
    const chartData = useMemo(() => data[activeTab] || [], [activeTab, data]);

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
                    keys={['Happy', 'Chill', 'Tired', 'Stress']}
                    indexBy="tag"
                    margin={{ top: 24, right: 24, bottom: 64, left: 24 }}
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
                    }]} theme={{ tooltip: { container: { background: '#333', color: '#fff' } }, legends: { text: { fill: '#fff' } }, axis: { ticks: { text: { fill: '#ccc' } }, legend: { text: { fill: '#fff' } } } }}
                />
            </div>
        </div>
    );
}