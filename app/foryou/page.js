'use client';

import { useState, useEffect } from 'react';
import styles from '../../styles/Dashboard.module.css';
import StatBoxes from '../../components/StatBoxes';
import MoodsSunburstChart from '../../components/MoodsSunburstChart';
import ConnectorsSunburstChart from '../../components/ConnectorsSunburstChart';
import TagsTreeMap from '../../components/TagsTreeMap';
import MoodsLineChart from '../../components/MoodsLineChart';
import ActivityCalendar from '../../components/ActivityCalendar';
import TopTagsRadar from '../../components/TopTagsRadar';
import ConnectorsBarChart from '../../components/ConnectorsBarChart';
import FormattedDate from '../../components/FormattedDate';
import MoodStackedBarChart from '../../components/MoodStackedBarChart';
import MoodConnectionsChart from '../../components/MoodConnectionsChart';

export default function ForYouPage() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/stats');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setStats(data.isEmpty ? { isEmpty: true } : data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
                setError('Could not load your stats. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (isLoading) return <div>Loading your stats...</div>;
    if (error) return <div>{error}</div>;
    if (!stats || stats.isEmpty) return <div className={styles.emptyMessage}>No entries yet. Start writing whenever you feel ready, and insights will appear here once there&apos;s enough to process.</div>;

    return (
        <div className={styles.container}>
            <h1>Insights for you</h1>

            {stats.subtitleData && (
                <p className={styles.subtitle}>
                    <strong>
                        {stats.subtitleData.totalJournals} journals</strong> - Writing from{' '}
                    <FormattedDate dateString={stats.subtitleData.firstDate} /> to{' '}
                    <FormattedDate dateString={stats.subtitleData.lastDate} />
                </p>
            )}

            <StatBoxes data={stats.statBoxes} />

            <div className={styles.chartGrid}>
                <div className={styles.chartContainer}>
                    <h3>Mood Distribution</h3>
                    <p className={styles.chartSubtitle}>The hierarchy of your recorded moods and tags.</p>
                    <MoodsSunburstChart data={stats.moodSunburstData} />
                </div>
                <div className={styles.chartContainer}>
                    <h3>Mood Connections</h3>
                    <p className={styles.chartSubtitle}>Which mood tags are frequently used together.</p>
                    <MoodConnectionsChart data={stats.moodConnectionsData} />
                </div>
            </div>

            <div className={styles.chartGrid}>
                <div className={styles.chartContainer}>
                    <h3>Mood Trends Over Time</h3>
                    <p className={styles.chartSubtitle}>Tracks the count of mood entries over your journal&apos;s history.</p>
                    <MoodsLineChart data={stats.lineChartData} />
                </div>
                <div className={styles.chartContainer}>
                    <h3>Top 10 Connectors</h3>
                    <p className={styles.chartSubtitle}>Your most used tags from Activities, People, and Places.</p>
                    <TopTagsRadar data={stats.radarData} />
                </div>
            </div>

            <div className={`${styles.chartRow} ${styles.calendarRow}`}>
                <h3>Journal Entries This Year</h3>
                <p className={styles.chartSubtitle}>A heatmap of your writing activity.</p>
                <ActivityCalendar data={stats.calendarData} />
            </div>

            <div className={styles.chartGrid}>
                <div className={styles.chartContainer}>
                    <h3>Connector Mood Correlation</h3>
                    <p className={styles.chartSubtitle}>The mood breakdown for each of your tags.</p>
                    <ConnectorsBarChart data={stats.stackedBarData} />
                </div>
                <div className={styles.chartContainer}>
                    <h3>Connector Distribution</h3>
                    <p className={styles.chartSubtitle}>The hierarchy of your Activities, People, and Places tags.</p>
                    <ConnectorsSunburstChart data={stats.connectorSunburstData} />
                </div>
            </div>

            <div className={styles.chartGrid}>
                <div className={styles.chartContainer}>
                    <h3>Moods by Time of Day</h3>
                    <p className={styles.chartSubtitle}>Your mood patterns recorded at different times.</p>
                    <MoodStackedBarChart data={stats.timeOfDayData} indexBy="time" />
                </div>
                <div className={styles.chartContainer}>
                    <h3>Moods by Day of Week</h3>
                    <p className={styles.chartSubtitle}>Your mood patterns across the days of the week.</p>
                    <MoodStackedBarChart data={stats.dayOfWeekData} indexBy="day" />
                </div>
            </div>

            <div className={styles.chartRow}>
                <h3>All Tags by Usage</h3>
                <p className={styles.chartSubtitle}>Shows all your tags sized by their total usage count.</p>
                <TagsTreeMap data={stats.treemapData} />
            </div>

        </div>
    );
}