'use client';

import { ResponsiveTreeMap } from '@nivo/treemap';

export default function TagsTreeMap({ data }) {
    return (
        <div style={{ height: '550px' }}>
            <ResponsiveTreeMap
                data={data}
                identity="name"
                value="value"
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                labelSkipSize={12}
                labelTextColor="#ffffff"
                parentLabelTextColor="#ffffff"
                borderColor="#1e1e1e"
                colors={{ scheme: 'spectral' }}
                theme={{
                    tooltip: { container: { background: '#333', color: '#fff' } }
                }}
            />
        </div>
    );
}