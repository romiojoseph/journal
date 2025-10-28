'use client';

import { ResponsiveSunburst } from '@nivo/sunburst';

const CustomTooltip = ({ id, value, data }) => {
    const displayText = data.displayName || id;

    if (!data.connectors || data.connectors.length === 0) {
        return (
            <div style={{ padding: '8px 12px', background: '#333', color: '#fff', borderRadius: '3px' }}>
                <strong>{displayText}</strong>: {value}
            </div>
        );
    }
    return (
        <div style={{ padding: '8px 12px', background: '#333', color: '#fff', borderRadius: '3px' }}>
            <strong>{displayText}</strong>: {value}<br />
            <strong style={{ color: '#aaa', marginTop: '5px', display: 'block' }}>Top Connectors:</strong>
            <ul style={{ paddingLeft: '15px', margin: 0, marginTop: '3px' }}>
                {data.connectors.map(c => <li key={c}>{c}</li>)}
            </ul>
        </div>
    );
};

export default function MoodConnectionsChart({ data }) {
    return (
        <div style={{ height: '450px' }}>
            <ResponsiveSunburst
                data={data}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                id="name"
                value="value"
                cornerRadius={2}
                borderWidth={1}
                borderColor="#1e1e1e"
                colors={{ scheme: 'spectral' }}
                childColor={{ from: 'color', modifiers: [['brighter', 0.2]] }}
                enableArcLabels={true}
                arcLabel={(d) => {
                    return d.data.displayName || d.id;
                }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#111"
                tooltip={CustomTooltip}
                theme={{
                    labels: { text: { fill: '#fff' } }
                }}
            />
        </div>
    );
}