import { useMemo } from 'react';
import { ResponsiveSunburst } from '@nivo/sunburst';

export default function TagsSunburstChart({ data }) {
    const totalSum = useMemo(() => {
        if (!data || !data.children) return 0;
        let sum = 0;
        data.children.forEach(category => {
            if (category.children) {
                category.children.forEach(child => {
                    sum += (child.value || 0);
                });
            }
        });
        return sum;
    }, [data]);

    return (
        <div style={{ height: '550px' }}>
            <ResponsiveSunburst
                data={data}
                margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
                id="id"
                value="value"
                cornerRadius={2}
                borderWidth={1}
                borderColor="#1e1e1e"
                colors={{ scheme: 'spectral' }}
                childColor={{ from: 'color', modifiers: [['brighter', 0.4]] }}
                enableArcLabels={true}
                arcLabel="name"
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#ffffff"
                theme={{
                    tooltip: { container: { background: '#333', color: '#fff', whiteSpace: 'nowrap' } },
                    labels: { text: { fill: '#fff' } }
                }}
                tooltip={({ data: nodeData, value }) => {
                    const percentage = totalSum > 0 ? ((value / totalSum) * 100).toFixed(1) : 0;
                    return (
                        <div style={{ padding: '6px 12px', background: '#333', color: '#fff', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                            <strong>{nodeData.name}</strong>: {percentage}% ({value} {value === 1 ? 'entry' : 'entries'})
                        </div>
                    );
                }}
            />
        </div>
    );
}