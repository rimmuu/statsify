'use client'
import { useParams } from 'next/navigation'
import Detail from '@/components/Detail'

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <Detail kind="track" id={String(id)} />
}
