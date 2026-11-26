'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react'
import { ChevronLeft, ChevronRight, Disc3 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { easeOut, flickSpring, flowSpring, tapPress, time, useMotionTier } from '@/lib/motion'
import type { Row } from '@/lib/stats'
import Art, { ambient, useAccent, useArtSrc } from './Art'
import ListenLinks from './ListenLinks'
import { AnimatedButton } from './Motion'
import { useAmbientLight } from './SpatialProvider'

type Props = {
  rows: Row[]
  totalMs: number
  onInspect: (row: Row) => void
}

const WINDOW = 4
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function FlowCard({
  row,
  index,
  pos,
  activeIndex,
  cardSize,
  spread,
  wingStep,
  spatial,
  onFocus,
  onInspect,
}: {
  row: Row
  index: number
  pos: MotionValue<number>
  activeIndex: number
  cardSize: number
  spread: number
  wingStep: number
  spatial: boolean
  onFocus: (i: number) => void
  onInspect: (row: Row) => void
}) {
  const x = useTransform(pos, (p) => {
    const d = index - p
    const ad = Math.abs(d)
    const sign = d < 0 ? -1 : 1
    if (ad <= 1) return d * spread
    return sign * (spread + (ad - 1) * wingStep)
  })

  const z = useTransform(pos, (p) => {
    if (!spatial) return 0
    const ad = Math.abs(index - p)
    if (ad <= 1) return 94 - ad * 168
    return -74 - (ad - 1) * 48
  })

  const rotateY = useTransform(pos, (p) => {
    if (!spatial) return 0
    const d = index - p
    const ad = Math.abs(d)
    if (ad < 0.01) return 0
    const sign = d < 0 ? 1 : -1
    const angle = ad <= 1 ? ad * 44 : Math.min(54, 44 + (ad - 1) * 5)
    return sign * angle
  })

  const scale = useTransform(pos, (p) => {
    const ad = Math.abs(index - p)
    return Math.max(0.68, 1 - ad * 0.12)
  })

  const opacity = useTransform(pos, (p) => {
    const ad = Math.abs(index - p)
    return Math.max(0, 1 - ad * 0.24)
  })

  const isCenter = index === activeIndex
  const zIndex = 24 - Math.min(20, Math.abs(index - activeIndex))

  return (
    <motion.div
      className="cf-card"
      style={{
        width: cardSize,
        height: cardSize,
        marginLeft: -cardSize / 2,
        marginTop: -cardSize / 2,
        x,
        z,
        rotateY,
        scale,
        opacity,
        zIndex,
      }}
    >
      <button
        type="button"
        onClick={() => (isCenter ? onInspect(row) : onFocus(index))}
        aria-label={`${index + 1}. ${row.name} — ${row.sub}`}
        className={`group relative block h-full w-full overflow-hidden rounded-[18px] text-left transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FA334F] ${
          isCenter
            ? 'ring-1 ring-white/25 shadow-[0_34px_76px_-14px_rgba(0,0,0,0.95)]'
            : 'ring-1 ring-white/10 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85)]'
        }`}
      >
        <Art fill eager u={row.uri} name={row.name} zoom={false} cls="h-full w-full rounded-[18px]" />
        <div aria-hidden className="cf-specular" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-[#080808]/75 px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#F5F5F5] ring-1 ring-white/15 backdrop-blur-md">
          {String(index + 1).padStart(2, '0')}
        </span>
      </button>
    </motion.div>
  )
}

export default function CoverFlow({ rows, totalMs, onInspect }: Props) {
  const { t, pct, hm } = useI18n()
  const tier = useMotionTier()
  const stageRef = useRef<HTMLDivElement>(null)
  const pos = useMotionValue(0)
  const [active, setActive] = useState(0)
  const [stageWidth, setStageWidth] = useState(760)
  const animRef = useRef<ReturnType<typeof animate> | null>(null)
  const wheelAccum = useRef(0)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      animRef.current?.stop()
      if (wheelTimer.current) clearTimeout(wheelTimer.current)
    },
    [],
  )

  const maxIdx = Math.max(0, rows.length - 1)
  const safeActive = Math.min(active, maxIdx)
  const focused = rows[safeActive]
  const artSrc = useArtSrc(focused?.uri ?? '')
  const rgb = useAccent(artSrc)
  useAmbientLight(rgb)

  useEffect(() => {
    if (pos.get() > maxIdx) {
      pos.set(maxIdx)
      setActive(maxIdx)
    }
  }, [maxIdx, pos])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const sync = () => setStageWidth(el.clientWidth || 760)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useMotionValueEvent(pos, 'change', (v) => {
    const next = clamp(Math.round(v), 0, maxIdx)
    setActive((cur) => (cur === next ? cur : next))
  })

  const snapTo = useCallback(
    (target: number, momentum = false) => {
      const clamped = clamp(Math.round(target), 0, maxIdx)
      setActive(clamped)
      animRef.current?.stop()
      if (tier === 'reduced' || Math.abs(clamped - pos.get()) > WINDOW * 2) {
        pos.set(clamped)
        return
      }
      animRef.current = animate(pos, clamped, momentum ? flickSpring : flowSpring)
    },
    [maxIdx, pos, tier],
  )

  const cardSize = Math.round(clamp(stageWidth * 0.34, 184, 276))
  const spread = Math.round(cardSize * 0.68)
  const wingStep = Math.round(cardSize * 0.36)
  const dragStepPx = Math.max(110, cardSize * 0.62)

  const drag = useRef({
    down: false,
    locked: null as null | 'h' | 'v',
    pointerId: -1,
    startX: 0,
    startY: 0,
    startPos: 0,
    lastX: 0,
    lastT: 0,
    vel: 0,
    moved: false,
  })

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    animRef.current?.stop()
    drag.current = {
      down: true,
      locked: null,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPos: pos.get(),
      lastX: e.clientX,
      lastT: performance.now(),
      vel: 0,
      moved: false,
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.down || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.locked) {
      if (Math.hypot(dx, dy) < 8) return
      if (Math.abs(dx) > Math.abs(dy) * 1.15) {
        d.locked = 'h'
        d.moved = true
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {}
      } else {
        d.locked = 'v'
        d.down = false
        return
      }
    }
    const now = performance.now()
    const dt = Math.max(8, now - d.lastT)
    const instVel = ((e.clientX - d.lastX) / dt) * 1000
    d.vel = d.vel * 0.4 + instVel * 0.6
    d.lastX = e.clientX
    d.lastT = now

    let raw = d.startPos - dx / dragStepPx
    // Soft rubber-banding past bounds
    if (raw < 0) raw *= 0.25
    else if (raw > maxIdx) raw = maxIdx + (raw - maxIdx) * 0.25
    pos.set(raw)
  }

  const endDrag = () => {
    const d = drag.current
    if (!d.down) return
    d.down = false
    if (d.locked === 'h') {
      const projected = -(d.vel / dragStepPx) * 0.17
      snapTo(pos.get() + clamp(projected, -3, 3), true)
    }
  }

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2 || Math.abs(e.deltaX) < 4) return
    wheelAccum.current += e.deltaX
    if (Math.abs(wheelAccum.current) >= 48) {
      const step = wheelAccum.current > 0 ? 1 : -1
      wheelAccum.current = 0
      snapTo(safeActive + step)
    }
    if (wheelTimer.current) clearTimeout(wheelTimer.current)
    wheelTimer.current = setTimeout(() => {
      wheelAccum.current = 0
    }, 160)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      snapTo(safeActive + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      snapTo(safeActive - 1)
    } else if (e.key === 'Enter' && e.target === e.currentTarget && focused) {
      e.preventDefault()
      onInspect(focused)
    }
  }

  if (!rows.length || !focused) return null

  const startIdx = Math.max(0, safeActive - WINDOW)
  const endIdx = Math.min(maxIdx, safeActive + WINDOW)
  const visible: number[] = []
  for (let i = startIdx; i <= endIdx; i++) visible.push(i)

  const share = totalMs ? pct((focused.ms / totalMs) * 100) : pct(0)
  const spatial = tier !== 'reduced'

  return (
    <div className="space-y-4 sm:space-y-6">
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={t('al.flow')}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            drag.current.moved = false
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        className="cf-stage amb rounded-[24px] border border-white/[0.08] bg-[#0B0B0D] outline-none focus-visible:ring-2 focus-visible:ring-[#FA334F]"
        style={ambient(rgb)}
      >
        {/* Studio floor illumination */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{
            background:
              'radial-gradient(52% 95% at 50% 100%, rgb(var(--ar) var(--ag) var(--ab) / 0.25), transparent 72%)',
          }}
        />

        {visible.map((idx) => (
          <FlowCard
            key={rows[idx].key}
            row={rows[idx]}
            index={idx}
            pos={pos}
            activeIndex={safeActive}
            cardSize={cardSize}
            spread={spread}
            wingStep={wingStep}
            spatial={spatial}
            onFocus={snapTo}
            onInspect={onInspect}
          />
        ))}
      </div>

      {/* Focused Record Metadata & Controls */}
      <div className="flex flex-col gap-5 border-y border-white/[0.08] py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <motion.div
            key={focused.key}
            initial={{ opacity: 0.55, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: easeOut }}
            className="min-w-0 space-y-1"
          >
            <div className="flex items-center gap-2 font-mono text-xs text-[#999999]">
              <span className="text-[#FA334F]">
                {String(safeActive + 1).padStart(2, '0')} / {String(rows.length).padStart(2, '0')}
              </span>
              <span>·</span>
              <span className="truncate">{focused.sub}</span>
              <span>·</span>
              <span className="shrink-0">{t('n.tracks', { n: focused.tracks })}</span>
            </div>
            <h2 className="display-editorial truncate text-3xl text-[#F5F5F5] sm:text-4xl">{focused.name}</h2>
            <p className="font-mono text-xs tabular-nums text-[#999999]">
              <span className="text-[#F5F5F5]">{hm(focused.ms)}</span> · {share}% · {t('n.plays', { n: focused.plays })}
            </p>
          </motion.div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ListenLinks compact item={{ kind: 'album', name: focused.name, artist: focused.sub }} />
          <AnimatedButton
            onClick={() => onInspect(focused)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#F5F5F5] px-4 text-xs font-semibold text-[#080808] hover:bg-white"
          >
            <Disc3 className="h-4 w-4 text-[#FA334F]" aria-hidden />
            <span>{t('al.inspect')}</span>
          </AnimatedButton>
          <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
            <motion.button
              type="button"
              aria-label={t('al.prev')}
              disabled={safeActive === 0}
              whileTap={safeActive === 0 ? undefined : tapPress}
              transition={{ duration: time.micro, ease: easeOut }}
              onClick={() => snapTo(safeActive - 1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#141417] text-[#F5F5F5] hover:bg-white/[0.1] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </motion.button>
            <motion.button
              type="button"
              aria-label={t('al.next')}
              disabled={safeActive >= maxIdx}
              whileTap={safeActive >= maxIdx ? undefined : tapPress}
              transition={{ duration: time.micro, ease: easeOut }}
              onClick={() => snapTo(safeActive + 1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#141417] text-[#F5F5F5] hover:bg-white/[0.1] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </motion.button>
          </div>
        </div>
      </div>

      {rows.length > 1 && (
        <div className="px-1">
          <input
            type="range"
            min={0}
            max={maxIdx}
            step={1}
            value={safeActive}
            aria-label={t('al.flow')}
            onChange={(e) => snapTo(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#FA334F]"
          />
        </div>
      )}
    </div>
  )
}
