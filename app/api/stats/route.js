import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import moodData from '../../../data/moods.json';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');
const getTimeOfDay = (date) => { const hour = new Date(date).getHours(); if (hour >= 5 && hour < 9) return 'Early morning'; if (hour >= 9 && hour < 13) return 'Morning'; if (hour >= 13 && hour < 17) return 'Afternoon'; if (hour >= 17 && hour < 21) return 'Evening'; if (hour >= 21 || hour < 1) return 'Late night'; return 'Deep night'; };
const getDayOfWeek = (date) => { const dayIndex = new Date(date).getDay(); const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; return days[dayIndex]; };

export async function GET() {
    try {
        const journalTagsSql = getQuery('select_all_journal_entries_with_tags.sql');
        const rawData = db.prepare(journalTagsSql).all();
        const summarySql = getQuery('get_journal_summary_stats.sql');
        const summaryData = db.prepare(summarySql).get();

        if (rawData.length === 0) return NextResponse.json({ isEmpty: true });

        const subtitleData = { totalJournals: summaryData.totalJournals, firstDate: summaryData.firstDate, lastDate: summaryData.lastDate };
        const tagCounts = rawData.reduce((acc, { name, type }) => { const key = `${name}_${type}`; if (!acc[key]) acc[key] = { name, type, count: 0 }; acc[key].count++; return acc; }, {});
        const processedStats = Object.values(tagCounts);
        const statBoxes = { Happy: 0, Chill: 0, Tired: 0, Stress: 0 };
        processedStats.filter(t => t.type === 'mood').forEach(tag => { const parentMood = moodData.moods.find(m => m.tags.includes(tag.name)); if (parentMood) statBoxes[parentMood.name] += tag.count; });
        const uniqueMoods = moodData.moods.reduce((acc, current) => { if (!acc.some(item => item.name === current.name)) acc.push(current); return acc; }, []);
        const moodSunburstData = { name: 'Moods', children: uniqueMoods.map(m => ({ name: m.name, color: m.color, children: [] })) };
        processedStats.filter(t => t.type === 'mood').forEach(tag => { const parentMood = moodData.moods.find(m => m.tags.includes(tag.name)); if (parentMood) { const moodNode = moodSunburstData.children.find(m => m.name === parentMood.name); if (moodNode) moodNode.children.push({ name: tag.name, value: tag.count }); } });
        const connectorSunburstData = { name: 'Connectors', children: [{ name: 'Activities', color: '#7b68ee', children: [] }, { name: 'People', color: '#20b2aa', children: [] }, { name: 'Places', color: '#db7093', children: [] }] };
        processedStats.filter(t => t.type !== 'mood').forEach(tag => { const categoryMap = { activity: 'Activities', people: 'People', place: 'Places' }; const categoryName = categoryMap[tag.type]; if (categoryName) { connectorSunburstData.children.find(c => c.name === categoryName).children.push({ name: tag.name, value: tag.count }); } });
        const treemapData = { name: 'All Tags', children: processedStats.map(tag => ({ name: tag.name, value: tag.count })) };
        const lineChartData = moodData.moods.map(m => ({ id: m.name, color: m.color, data: [] }));
        const dailyMoodCounts = {};
        rawData.filter(d => d.type === 'mood').forEach(entry => { const date = entry.createdAt.split(' ')[0]; const parentMood = moodData.moods.find(m => m.tags.includes(entry.name)); if (parentMood) { if (!dailyMoodCounts[date]) dailyMoodCounts[date] = { Happy: 0, Chill: 0, Tired: 0, Stress: 0 }; dailyMoodCounts[date][parentMood.name]++; } });
        Object.entries(dailyMoodCounts).forEach(([date, moods]) => { for (const moodName of ['Happy', 'Chill', 'Tired', 'Stress']) { const series = lineChartData.find(s => s.id === moodName); if (series) series.data.push({ x: date, y: moods[moodName] || 0 }); } });
        lineChartData.forEach(series => { series.data.sort((a, b) => new Date(a.x) - new Date(b.x)); });
        const yearlyCalendarData = rawData.reduce((acc, { createdAt }) => { const date = new Date(createdAt); const year = date.getFullYear(); const day = date.toISOString().split('T')[0]; if (!acc[year]) acc[year] = {}; if (!acc[year][day]) acc[year][day] = new Set(); acc[year][day].add(createdAt); return acc; }, {});
        const calendarData = Object.entries(yearlyCalendarData).reduce((acc, [year, days]) => { acc[year] = Object.entries(days).map(([day, entriesSet]) => ({ day, value: entriesSet.size })); return acc; }, {});
        const radarData = processedStats.filter(tag => tag.type !== 'mood').sort((a, b) => b.count - a.count).slice(0, 10).map(tag => ({ tag: tag.name, count: tag.count }));
        const typeToCategoryMap = { activity: 'activities', people: 'people', place: 'places' };
        const journalTagMap = rawData.reduce((acc, { createdAt, name, type }) => { if (!acc[createdAt]) acc[createdAt] = { moods: [], activities: [], people: [], places: [] }; if (type === 'mood') { const parentMood = moodData.moods.find(m => m.tags.includes(name)); if (parentMood) acc[createdAt].moods.push({ name: name, parent: parentMood.name }); } else { const category = typeToCategoryMap[type]; if (category && !acc[createdAt][category].includes(name)) acc[createdAt][category].push(name); } return acc; }, {});
        const connectorMoodCounts = { activities: {}, people: {}, places: {} };
        Object.values(journalTagMap).forEach(journal => { ['activities', 'people', 'places'].forEach(category => { journal[category]?.forEach(connector => { if (!connectorMoodCounts[category][connector]) connectorMoodCounts[category][connector] = { Happy: 0, Chill: 0, Tired: 0, Stress: 0, total: 0 }; journal.moods.forEach(mood => { if (connectorMoodCounts[category][connector][mood.parent] !== undefined) { connectorMoodCounts[category][connector][mood.parent]++; connectorMoodCounts[category][connector].total++; } }); }); }); });
        const stackedBarData = { activities: Object.entries(connectorMoodCounts.activities).map(([tag, counts]) => ({ tag, ...counts })).filter(item => item.total > 0), people: Object.entries(connectorMoodCounts.people).map(([tag, counts]) => ({ tag, ...counts })).filter(item => item.total > 0), places: Object.entries(connectorMoodCounts.places).map(([tag, counts]) => ({ tag, ...counts })).filter(item => item.total > 0) };
        const timeOfDayBins = { 'Early morning': {}, 'Morning': {}, 'Afternoon': {}, 'Evening': {}, 'Late night': {}, 'Deep night': {} };
        rawData.filter(d => d.type === 'mood').forEach(({ createdAt, name }) => { const timeOfDay = getTimeOfDay(createdAt); const parentMood = moodData.moods.find(m => m.tags.includes(name)); if (parentMood) { if (!timeOfDayBins[timeOfDay][parentMood.name]) timeOfDayBins[timeOfDay][parentMood.name] = 0; timeOfDayBins[timeOfDay][parentMood.name]++; } });
        const timeOfDayData = Object.entries(timeOfDayBins).map(([time, moods]) => ({ time, ...moods }));
        const dayOfWeekBins = { 'Monday': {}, 'Tuesday': {}, 'Wednesday': {}, 'Thursday': {}, 'Friday': {}, 'Saturday': {}, 'Sunday': {} };
        rawData.filter(d => d.type === 'mood').forEach(({ createdAt, name }) => { const dayOfWeek = getDayOfWeek(createdAt); const parentMood = moodData.moods.find(m => m.tags.includes(name)); if (parentMood) { if (!dayOfWeekBins[dayOfWeek][parentMood.name]) dayOfWeekBins[dayOfWeek][parentMood.name] = 0; dayOfWeekBins[dayOfWeek][parentMood.name]++; } });
        const dayOfWeekData = Object.entries(dayOfWeekBins).map(([day, moods]) => ({ day, ...moods }));

        const moodTagCounts = processedStats.filter(t => t.type === 'mood');
        const top10MoodTags = moodTagCounts
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(t => t.name);

        const connections = {};

        Object.values(journalTagMap).forEach(journal => {
            const journalMoodNames = journal.moods.map(m => m.name);
            if (journalMoodNames.length < 2) return;

            const topTagsInJournal = journalMoodNames.filter(name => top10MoodTags.includes(name));
            if (topTagsInJournal.length === 0) return;

            topTagsInJournal.forEach(topTag => {
                if (!connections[topTag]) {
                    connections[topTag] = {};
                }
                const otherMoodsInJournal = journalMoodNames.filter(name => name !== topTag);

                otherMoodsInJournal.forEach(otherTag => {
                    const pairKey = otherTag;
                    if (!connections[topTag][pairKey]) {
                        connections[topTag][pairKey] = { count: 0, connectors: {} };
                    }
                    connections[topTag][pairKey].count++;
                    ['activities', 'people', 'places'].forEach(category => {
                        journal[category].forEach(connector => {
                            if (!connections[topTag][pairKey].connectors[connector]) {
                                connections[topTag][pairKey].connectors[connector] = 0;
                            }
                            connections[topTag][pairKey].connectors[connector]++;
                        });
                    });
                });
            });
        });

        const moodConnectionsData = {
            name: 'Mood Connections',
            children: top10MoodTags.map(topTag => {
                const targetConnections = connections[topTag] || {};
                const children = Object.entries(targetConnections)
                    .filter(([_, data]) => data.count >= 3)
                    .map(([targetTag, data]) => {
                        const topConnectors = Object.entries(data.connectors)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([connector, _]) => connector);
                        return {
                            name: `${topTag}_${targetTag}`,
                            displayName: targetTag,
                            value: data.count,
                            connectors: topConnectors
                        };
                    })
                    .sort((a, b) => b.value - a.value);

                return {
                    name: topTag,
                    children: children
                };
            }).filter(node => node.children.length > 0)
        };

        if (moodConnectionsData.children.length === 0) {
            moodConnectionsData.children = [{ name: 'No recurring connections found (min. 3)', value: 1 }];
        }

        return NextResponse.json({
            subtitleData, statBoxes, moodSunburstData, connectorSunburstData, treemapData,
            lineChartData, calendarData, radarData, stackedBarData,
            timeOfDayData, dayOfWeekData, moodConnectionsData
        });

    } catch (error) {
        console.error('Failed to generate stats:', error);
        return NextResponse.json({ error: 'Failed to generate stats.' }, { status: 500 });
    }
}