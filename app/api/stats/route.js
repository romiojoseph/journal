// Force recompile
// Triggering Next.js HMR
import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import { getTags } from '../../../lib/tags';
import { validateSession } from '../../../lib/security';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');
const getTimeOfDay = (date) => { const hour = new Date(date).getHours(); if (hour >= 5 && hour < 9) return 'Early morning'; if (hour >= 9 && hour < 13) return 'Morning'; if (hour >= 13 && hour < 17) return 'Afternoon'; if (hour >= 17 && hour < 21) return 'Evening'; if (hour >= 21 || hour < 1) return 'Late night'; return 'Deep night'; };
const getDayOfWeek = (date) => { const dayIndex = new Date(date).getDay(); const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; return days[dayIndex]; };

export async function GET(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const moodData = await getTags();
        const journalTagsSql = getQuery('select_all_journal_entries_with_tags.sql');
        const rawData = db.prepare(journalTagsSql).all();
        const summarySql = getQuery('get_journal_summary_stats.sql');
        const summaryData = db.prepare(summarySql).get();

        if (rawData.length === 0) return NextResponse.json({ isEmpty: true });

        const subtitleData = { totalJournals: summaryData.totalJournals, firstDate: summaryData.firstDate, lastDate: summaryData.lastDate };
        const tagCounts = rawData.reduce((acc, { name, type }) => { const key = `${name}_${type}`; if (!acc[key]) acc[key] = { name, type, count: 0 }; acc[key].count++; return acc; }, {});
        const processedStats = Object.values(tagCounts);

        const statBoxes = {};
        moodData.moods.forEach(m => statBoxes[m.name] = 0);
        processedStats.filter(t => t.type === 'mood').forEach(tag => {
            const parentMood = moodData.moods.find(m => m.name === tag.name || m.tags.includes(tag.name));
            if (parentMood) statBoxes[parentMood.name] += tag.count;
        });

        const uniqueMoods = moodData.moods.reduce((acc, current) => { if (!acc.some(item => item.name === current.name)) acc.push(current); return acc; }, []);
        const moodSunburstData = { id: 'root_moods', name: 'Moods', children: uniqueMoods.map(m => ({ id: `mood_${m.name}`, name: m.name, color: m.color, children: [] })) };
        processedStats.filter(t => t.type === 'mood').forEach(tag => {
            const parentMood = moodData.moods.find(m => m.name === tag.name || m.tags.includes(tag.name));
            if (parentMood) {
                const moodNode = moodSunburstData.children.find(m => m.name === parentMood.name);
                if (moodNode) {
                    const childName = tag.name === parentMood.name ? `${tag.name} (Core)` : tag.name;
                    moodNode.children.push({ id: `mood_tag_${tag.name}`, name: childName, value: tag.count });
                }
            }
        });

        const connectorSunburstData = {
            id: 'root_connectors',
            name: 'Connectors',
            children: [
                { id: 'activities', name: 'Activities', color: '#7b68ee', children: [] },
                { id: 'people', name: 'People', color: '#20b2aa', children: [] },
                { id: 'places', name: 'Places', color: '#db7093', children: [] }
            ]
        };
        processedStats.filter(t => t.type !== 'mood').forEach(tag => {
            const categoryMap = { activity: 'Activities', people: 'People', place: 'Places' };
            const categoryName = categoryMap[tag.type];
            if (categoryName) {
                const catNode = connectorSunburstData.children.find(c => c.name === categoryName);
                if (catNode) catNode.children.push({ id: `${tag.type}_${tag.name}`, name: tag.name, value: tag.count });
            }
        });

        const treemapData = {
            id: 'root_treemap',
            name: 'All Tags',
            children: processedStats.map(tag => ({
                id: `tm_${tag.type}_${tag.name}`,
                name: tag.name,
                value: tag.count
            }))
        };

        // Unified entry-based processing
        const typeToCategoryMap = { activity: 'activities', people: 'people', place: 'places' };
        const journalEntriesMap = rawData.reduce((acc, row) => {
            if (!acc[row.id]) {
                acc[row.id] = {
                    id: row.id,
                    createdAt: row.createdAt,
                    date: row.createdAt.split(' ')[0],
                    moods: new Set(),
                    rawMoods: new Set(),
                    activities: new Set(),
                    people: new Set(),
                    places: new Set()
                };
            }
            if (row.type === 'mood') {
                const parentMood = moodData.moods.find(m => m.name === row.name || m.tags.includes(row.name));
                if (parentMood) acc[row.id].moods.add(parentMood.name);
                acc[row.id].rawMoods.add(row.name);
            } else {
                const category = typeToCategoryMap[row.type];
                if (category) acc[row.id][category].add(row.name);
            }
            return acc;
        }, {});

        const journalEntries = Object.values(journalEntriesMap);

        // Data for Trend Chart
        const lineData = moodData.moods.map(m => ({ id: m.name, color: m.color, data: [] }));
        const dailyMoodCounts = {};
        journalEntries.forEach(entry => {
            if (!dailyMoodCounts[entry.date]) {
                dailyMoodCounts[entry.date] = {};
                moodData.moods.forEach(m => dailyMoodCounts[entry.date][m.name] = 0);
            }
            entry.moods.forEach(moodName => { dailyMoodCounts[entry.date][moodName]++; });
        });

        const dates = Object.keys(dailyMoodCounts).sort();
        if (dates.length > 0) {
            const firstDate = new Date(dates[0]);
            const lastDate = new Date(dates[dates.length - 1]);
            const fullDateRange = [];
            for (let d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
                fullDateRange.push(d.toISOString().split('T')[0]);
            }
            fullDateRange.forEach(date => {
                const counts = dailyMoodCounts[date] || moodData.moods.reduce((acc, m) => ({ ...acc, [m.name]: 0 }), {});
                moodData.moods.forEach(m => {
                    const series = lineData.find(s => s.id === m.name);
                    if (series) series.data.push({ x: date, y: counts[m.name] || 0 });
                });
            });
        }

        // Calendar Data — count every individual mood tag (matching JournalCard logic)
        const calendarRaw = {};
        rawData.forEach(row => {
            const day = row.createdAt.split(' ')[0];
            const year = new Date(row.createdAt).getFullYear();
            if (!calendarRaw[year]) calendarRaw[year] = {};
            if (!calendarRaw[year][day]) calendarRaw[year][day] = { entryIds: new Set(), moodCounts: { Happy: 0, Chill: 0, Tired: 0, Stress: 0 } };
            calendarRaw[year][day].entryIds.add(row.id);

            if (row.type === 'mood') {
                const parentMood = moodData.moods.find(m => m.name === row.name || m.tags.includes(row.name));
                if (parentMood && calendarRaw[year][day].moodCounts.hasOwnProperty(parentMood.name)) {
                    calendarRaw[year][day].moodCounts[parentMood.name]++;
                }
            }
        });

        const calendarData = {};
        Object.keys(calendarRaw).forEach(year => {
            calendarData[year] = Object.entries(calendarRaw[year]).map(([day, data]) => {
                const maxCount = Math.max(...Object.values(data.moodCounts));
                const winners = Object.entries(data.moodCounts)
                    .filter(([_, count]) => count === maxCount && count > 0)
                    .map(([name]) => name);

                const dominantMood = winners[0];
                const moodColor = moodData.moods.find(m => m.name === dominantMood)?.color || null;

                return { day, value: data.entryIds.size, moodColor, moodName: dominantMood };
            });
        });

        // Radar Data (Top 10 Connectors)
        const radarData = processedStats
            .filter(tag => tag.type !== 'mood')
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(tag => ({ tag: tag.name, count: tag.count }));

        // Connector Mood Correlation
        const connectorMoodCounts = { activities: {}, people: {}, places: {} };
        journalEntries.forEach(journal => {
            ['activities', 'people', 'places'].forEach(category => {
                journal[category].forEach(connector => {
                    if (!connectorMoodCounts[category][connector]) {
                        connectorMoodCounts[category][connector] = { total: 0 };
                        moodData.moods.forEach(m => connectorMoodCounts[category][connector][m.name] = 0);
                    }
                    journal.moods.forEach(moodName => {
                        connectorMoodCounts[category][connector][moodName]++;
                        connectorMoodCounts[category][connector].total++;
                    });
                });
            });
        });
        const stackedBarData = {
            activities: Object.entries(connectorMoodCounts.activities).map(([tag, counts]) => ({ tag, ...counts })).filter(item => item.total > 0),
            people: Object.entries(connectorMoodCounts.people).map(([tag, counts]) => ({ tag, ...counts })).filter(item => item.total > 0),
            places: Object.entries(connectorMoodCounts.places).map(([tag, counts]) => ({ tag, ...counts })).filter(item => item.total > 0)
        };

        // Time Distribution
        const timeOfDayBins = { 'Early morning': {}, 'Morning': {}, 'Afternoon': {}, 'Evening': {}, 'Late night': {}, 'Deep night': {} };
        const dayOfWeekBins = { 'Monday': {}, 'Tuesday': {}, 'Wednesday': {}, 'Thursday': {}, 'Friday': {}, 'Saturday': {}, 'Sunday': {} };
        journalEntries.forEach(({ createdAt, moods }) => {
            const tod = getTimeOfDay(createdAt);
            const dow = getDayOfWeek(createdAt);
            moods.forEach(moodName => {
                timeOfDayBins[tod][moodName] = (timeOfDayBins[tod][moodName] || 0) + 1;
                dayOfWeekBins[dow][moodName] = (dayOfWeekBins[dow][moodName] || 0) + 1;
            });
        });
        const timeOfDayData = Object.entries(timeOfDayBins).map(([time, moods]) => ({ time, ...moods }));
        const dayOfWeekData = Object.entries(dayOfWeekBins).map(([day, moods]) => ({ day, ...moods }));

        // Mood Connections
        const moodTagCounts = processedStats.filter(t => t.type === 'mood');
        const top10MoodTags = moodTagCounts.sort((a, b) => b.count - a.count).slice(0, 10).map(t => t.name);
        const connections = {};
        journalEntries.forEach(journal => {
            const entryMoodNames = Array.from(journal.rawMoods);
            if (entryMoodNames.length < 2) return;
            const topTagsInJournal = entryMoodNames.filter(name => top10MoodTags.includes(name));
            topTagsInJournal.forEach(topTag => {
                if (!connections[topTag]) connections[topTag] = {};
                entryMoodNames.filter(name => name !== topTag).forEach(otherTag => {
                    if (!connections[topTag][otherTag]) connections[topTag][otherTag] = { count: 0, connectors: {} };
                    connections[topTag][otherTag].count++;
                    ['activities', 'people', 'places'].forEach(category => {
                        journal[category].forEach(connector => {
                            connections[topTag][otherTag].connectors[connector] = (connections[topTag][otherTag].connectors[connector] || 0) + 1;
                        });
                    });
                });
            });
        });
        const moodConnectionsData = {
            id: 'root_mood_connections',
            name: 'Mood Connections',
            children: top10MoodTags.map(topTag => {
                const targetConnections = connections[topTag] || {};
                const children = Object.entries(targetConnections)
                    .filter(([_, data]) => data.count >= 1)
                    .map(([targetTag, data]) => ({
                        id: `mc_${topTag}_${targetTag}`,
                        name: targetTag,
                        value: data.count,
                        connectors: Object.entries(data.connectors).sort((a, b) => b[1] - a[1]).slice(0, 5).map(c => c[0])
                    }))
                    .sort((a, b) => b.value - a.value);
                return { id: `mc_group_${topTag}`, name: topTag, children: children };
            }).filter(node => node.children.length > 0)
        };
        if (moodConnectionsData.children.length === 0) {
            moodConnectionsData.children = [{ id: 'mc_empty', name: 'No recurring connections found', value: 1 }];
        }

        // Metadata for dynamic charts
        const moodMeta = moodData.moods.map(m => ({ name: m.name, color: m.color }));

        return NextResponse.json({
            subtitleData, statBoxes, moodSunburstData, connectorSunburstData, treemapData,
            lineChartData: lineData, calendarData, radarData, stackedBarData,
            timeOfDayData, dayOfWeekData, moodConnectionsData, moodMeta
        });

    } catch (error) {
        console.error('Failed to generate stats:', error);
        return NextResponse.json({ error: 'Failed to generate stats.' }, { status: 500 });
    }
}