'use client';

import { ResponsiveSunburst } from '@nivo/sunburst';

export default function TagsSunburstChart({ data }) {
    return (
        <div style={{ height: '550px' }}>
            <ResponsiveSunburst
                data={data}
                margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
                id="name"
                value="value"
                cornerRadius={2}
                borderWidth={1}
                borderColor="#1e1e1e"
                colors={{ scheme: 'spectral' }}
                childColor={{ from: 'color', modifiers: [['brighter', 0.4]] }}
                enableArcLabels={true}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#ffffff"
                theme={{
                    tooltip: { container: { background: '#333', color: '#fff' } },
                    labels: { text: { fill: '#fff' } }
                }}
            />
        </div>
    );
}