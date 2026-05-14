'use client';

import { useState, useMemo } from 'react';
import { ResponsiveTimeRange } from '@nivo/calendar';
import styles from '../styles/Dashboard.module.css';
import { formatDate } from '../lib/time-utils';

// Mood name → numeric code mapping. Nivo will map these values to colors via its scale.
const MOOD_CODE = { Chill: 1, Happy: 2, Tired: 3, Stress: 4 };
const MOOD_COLORS = ['#5DADEC', '#FDD655', '#FF893F', '#FF4B4B']; // Same order as codes 1-4
const MOOD_NAME_BY_CODE = { 1: 'Chill', 2: 'Happy', 3: 'Tired', 4: 'Stress' };
const MOOD_COLOR_BY_CODE = { 1: '#5DADEC', 2: '#FDD655', 3: '#FF893F', 4: '#FF4B4B' };

const FREQUENCY_COLORS = ['#61cdbb', '#97e3d5', '#e8c1a0', '#f47560'];

export default function ActivityCalendar({ data }) {
    const years = Object.keys(data).sort((a, b) => b - a);
    const [activeYear, setActiveYear] = useState(years[0]);
    const [viewMode, setViewMode] = useState('frequency');

    if (!data || years.length === 0) {
        return <div className={styles.emptyChartMessage}>No calendar data available.</div>;
    }

    // Build two separate data arrays for Nivo
    const { frequencyData, moodData: moodChartData } = useMemo(() => {
        const yearData = data[activeYear] || [];
        const freq = [];
        const mood = [];

        yearData.forEach(item => {
            freq.push({ day: item.day, value: item.value });

            if (item.moodName && MOOD_CODE[item.moodName]) {
                mood.push({ day: item.day, value: MOOD_CODE[item.moodName] });
            }
        });

        return { frequencyData: freq, moodData: mood };
    }, [data, activeYear]);

    const isMoodMode = viewMode === 'mood';
    const chartData = isMoodMode ? moodChartData : frequencyData;
    const chartColors = isMoodMode ? MOOD_COLORS : FREQUENCY_COLORS;

    // Build a lookup for tooltip display when in mood mode
    const moodLookup = useMemo(() => {
        const map = {};
        (data[activeYear] || []).forEach(item => {
            if (item.moodName) {
                map[item.day] = { name: item.moodName, color: item.moodColor, entries: item.value };
            }
        });
        return map;
    }, [data, activeYear]);

    return (
        <div className={styles.calendarContainer}>
            <div className={styles.tabNav}>
                {years.map(year => (
                    <button key={year} onClick={() => setActiveYear(year)} className={activeYear === year ? styles.activeTab : ''}>
                        {year}
                    </button>
                ))}
            </div>

            <div className={styles.toggleWrapper}>
                <span className={styles.toggleLabel} style={{ opacity: !isMoodMode ? 1 : 0.7 }}>Activity Frequency</span>
                <label className={styles.toggleSwitch}>
                    <input
                        type="checkbox"
                        checked={isMoodMode}
                        onChange={() => setViewMode(prev => prev === 'frequency' ? 'mood' : 'frequency')}
                    />
                    <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel} style={{ opacity: isMoodMode ? 1 : 0.7 }}>Daily Mood</span>
            </div>

            <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveTimeRange
                    key={`${viewMode}-${activeYear}`}
                    data={chartData}
                    from={`${activeYear}-01-01`}
                    to={`${activeYear}-12-31`}
                    emptyColor="#2e2e2e"
                    colors={chartColors}
                    minValue={isMoodMode ? 1 : 'auto'}
                    maxValue={isMoodMode ? 4 : 'auto'}
                    margin={{ top: 20, right: 40, bottom: 0, left: 40 }}
                    dayBorderWidth={2}
                    dayBorderColor="#1e1e1e"
                    theme={{
                        tooltip: { container: { background: '#333', color: '#fff', whiteSpace: 'nowrap' } },
                        legends: { text: { fill: '#fff' } },
                        labels: { text: { fill: '#ccc' } }
                    }}
                    tooltip={({ day, value }) => {
                        if (isMoodMode) {
                            const moodName = MOOD_NAME_BY_CODE[value];
                            const moodColor = MOOD_COLOR_BY_CODE[value];
                            const info = moodLookup[day];
                            return (
                                <div style={{ padding: '6px 12px', color: '#fff', background: '#333', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                    <strong>{formatDate(day)}</strong>
                                    {info && <span style={{ opacity: 0.8 }}> · {info.entries} {info.entries === 1 ? 'entry' : 'entries'}</span>}
                                    {moodName && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                            <span style={{ width: 8, height: 8, backgroundColor: moodColor, borderRadius: '50%', flexShrink: 0 }}></span>
                                            <span>{moodName}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return (
                            <div style={{ padding: '6px 12px', color: '#fff', background: '#333', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                <strong>{formatDate(day)}</strong>: {value} {value === 1 ? 'entry' : 'entries'}
                            </div>
                        );
                    }}
                />
            </div>
        </div>
    );
}