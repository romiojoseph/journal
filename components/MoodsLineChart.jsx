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
                xFormat="time:%d %b, %Y"
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
                tooltip={({ point }) => (
                    <div style={{ padding: '6px 12px', background: '#333', color: '#fff', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                        <span style={{ width: 12, height: 12, backgroundColor: point.color, borderRadius: '50%' }}></span>
                        <span>
                            <strong>{point.serieId}</strong> on {point.data.xFormatted}: <strong>{point.data.yFormatted} Entries</strong>
                        </span>
                    </div>
                )}
                theme={{ tooltip: { container: { background: '#333', color: '#fff', whiteSpace: 'nowrap' } }, legends: { text: { fill: '#fff' } }, axis: { ticks: { text: { fill: '#ccc' } }, legend: { text: { fill: '#fff' } } } }}
            />
        </div>
    );
}