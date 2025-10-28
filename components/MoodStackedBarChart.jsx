'use client';
import { ResponsiveBar } from '@nivo/bar';

const moodColors = { Happy: '#FDD655', Chill: '#5DADEC', Tired: '#FF893F', Stress: '#FF4B4B' };
const getColor = (bar) => moodColors[bar.id];

export default function MoodStackedBarChart({ data, indexBy, legend }) {
    return (
        <div style={{ height: '450px' }}>
            <ResponsiveBar
                data={data}
                keys={['Happy', 'Chill', 'Tired', 'Stress']}
                indexBy={indexBy}
                margin={{ top: 24, right: 24, bottom: 64, left: 24 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors={getColor}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend,
                    legendPosition: 'middle',
                    legendOffset: 45
                }}
                axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legendPosition: 'middle',
                    legendOffset: -40
                }}
                enableGridY={false}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor="#111"
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
                }]}
                theme={{
                    tooltip: { container: { background: '#333', color: '#fff' } },
                    legends: { text: { fill: '#fff' } },
                    axis: { ticks: { text: { fill: '#ccc' } }, legend: { text: { fill: '#fff' } } }
                }}
            />
        </div>
    );
}