'use client'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function HoursChart({ data }: { data: { k: string | number; h: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <XAxis dataKey="k" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} width={36} />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,.05)' }} contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 12 }} formatter={(v) => `${v} h`} />
        <Bar dataKey="h" fill="#1DB954" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
