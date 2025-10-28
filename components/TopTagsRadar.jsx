'use client';
import { ResponsiveRadar } from '@nivo/radar';

export default function TopTagsRadar({ data }) {
    return (
        <div style={{ height: '450px' }}>
            <ResponsiveRadar
                data={data}
                keys={['count']}
                indexBy="tag"
                valueFormat=">-.2f"
                margin={{ top: 32, right: 24, bottom: 32, left: 24 }}
                gridLevels={3}
                borderColor={{ from: 'background' }}
                gridLabelOffset={24}
                gridShape="linear"
                enableDots={true}
                fillOpacity={0.32}
                dotSize={10}
                dotColor={{ theme: 'background' }}
                dotBorderWidth={2}
                colors={{ scheme: 'set3' }}
                motionConfig="wobbly"
                theme={{
                    tooltip: {
                        container: {
                            background: '#1e1e1e',
                            color: '#fff',
                            border: '1px solid #333'
                        }
                    },
                    grid: {
                        line: {
                            stroke: '#333',
                            strokeWidth: 1
                        }
                    }
                }}
            />
        </div>
    );
}