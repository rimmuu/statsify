'use client'
import { useReducedMotion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function HoursChart({ data }: { data: { k: string | number; h: number }[] }) {
  const { t } = useI18n()
  const reduce = useReducedMotion() // bars grow and re-flow when the data changes, unless the device asks for less motion
  const peak = data.reduce((max, point) => Math.max(max, point.h), 0)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 0, right: 6, top: 12, bottom: 0 }}><CartesianGrid vertical={false} stroke="#2b2b2b" strokeDasharray="2 5" />
        <XAxis dataKey="k" stroke="#999999" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis stroke="#999999" fontSize={11} tickLine={false} axisLine={false} width={36} />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,.05)' }} contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: 12 }} formatter={(v) => `${v} ${t('u.h')}`} />
        <Bar isAnimationActive={!reduce} animationDuration={650} animationEasing="ease-out" dataKey="h" maxBarSize={32} radius={[3, 3, 0, 0]}>
          {data.map(point => <Cell key={point.k} fill={point.h > 0 && point.h === peak ? '#F04458' : '#77777d'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
