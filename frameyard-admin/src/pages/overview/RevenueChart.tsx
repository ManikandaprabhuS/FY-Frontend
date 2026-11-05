import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RevenueChartProps = {
  data: Array<{ day: string; revenue: number }>;
};

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
      <defs>
        <linearGradient id="revenueGreenFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111827" stopOpacity={0.34} />
          <stop offset="48%" stopColor="#111827" stopOpacity={0.14} />
          <stop offset="100%" stopColor="#111827" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="0" vertical stroke="rgba(15,23,42,0.08)" />
      <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: '#6b7280', fontWeight: 700 }} />
      <YAxis tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: '#6b7280', fontWeight: 700 }} tickFormatter={(value) => `₹${value}`} />
      <Tooltip
        contentStyle={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '10px', color: '#111827', fontSize: '12px' }}
        labelStyle={{ color: '#111827', fontWeight: 700 }}
        formatter={(value) => [`₹${value}`, 'Revenue']}
      />
      <Area
        type="natural"
        dataKey="revenue"
        stroke="#111827"
        strokeWidth={3.2}
        fill="url(#revenueGreenFill)"
        dot={{ r: 4.5, stroke: '#111827', strokeWidth: 2, fill: '#ffffff' }}
        activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#111827' }}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default RevenueChart;
