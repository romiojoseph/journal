import { useMemo } from 'react';
import { ResponsiveSunburst } from '@nivo/sunburst';

export default function MoodsSunburstChart({ data }) {
    const totalSum = useMemo(() => {
        if (!data || !data.children) return 0;
        // Sum up all leaf nodes (individual mood tags)
        let sum = 0;
        data.children.forEach(moodGroup => {
            if (moodGroup.children) {
                moodGroup.children.forEach(child => {
                    sum += (child.value || 0);
                });
            }
        });
        return sum;
    }, [data]);

    return (
        <div style={{ height: '450px' }}>
            <ResponsiveSunburst
                data={data}
                margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
                id="id"
                value="value"
                cornerRadius={2}
                borderWidth={1}
                borderColor="#1e1e1e"
                colors={d => d.data.color}
                childColor={{ from: 'color', modifiers: [['brighter', 0.2]] }}
                enableArcLabels={true}
                arcLabel="name"
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#111"
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