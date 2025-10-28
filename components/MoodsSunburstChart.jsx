'use client';

import { ResponsiveSunburst } from '@nivo/sunburst';

export default function MoodsSunburstChart({ data }) {
    return (
        <div style={{ height: '450px' }}>
            <ResponsiveSunburst
                data={data}
                margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
                id="name"
                value="value"
                cornerRadius={2}
                borderWidth={1}
                borderColor="#1e1e1e"
                colors={d => d.data.color}
                childColor={{ from: 'color', modifiers: [['brighter', 0.2]] }}
                enableArcLabels={true}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#111"
                theme={{
                    tooltip: { container: { background: '#333', color: '#fff' } },
                    labels: { text: { fill: '#fff' } }
                }}
            />
        </div>
    );
}