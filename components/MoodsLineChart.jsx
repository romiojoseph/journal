'use client';
import { ResponsiveLine } from '@nivo/line';

export default function MoodsLineChart({ data }) {
    return (
        <div style={{ height: '450px' }}>
            <ResponsiveLine
                data={data}
                margin={{ top: 24, right: 24, bottom: 48, left: 24 }}
                xScale={{
                    type: 'time',
                    format: '%Y-%m-%d',
                    useUTC: false,
                    precision: 'day',
                }}
                xFormat="time:%Y-%m-%d"
                yScale={{ type: 'linear', min: 0, max: 'auto' }}
                yFormat=" >-.0f"
                axisTop={null}
                axisRight={null}
                axisBottom={null}
                axisLeft={null}
                enableGridY={false}
                enableGridX={false}
                colors={d => d.color}
                pointSize={8}
                pointColor={{ theme: 'background' }}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                useMesh={true}
                curve="monotoneX"
                enableArea={true}
                areaOpacity={0.15}
                legends={[{
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 48,
                    itemsSpacing: 0,
                    itemDirection: 'left-to-right',
                    itemWidth: 80,
                    itemHeight: 20,
                    itemOpacity: 0.75,
                    symbolSize: 12,
                    symbolShape: 'circle',
                    effects: [{ on: 'hover', style: { itemOpacity: 1 } }]
                }]}
                theme={{ tooltip: { container: { background: '#333', color: '#fff' } }, legends: { text: { fill: '#fff' } }, axis: { ticks: { text: { fill: '#ccc' } }, legend: { text: { fill: '#fff' } } } }}
            />
        </div>
    );
}