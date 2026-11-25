'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform, type MotionValue } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { ease, flowSpring, tapPress, time, useMotionTier } from '@/lib/motion'
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

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

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
    if (ad <= 1) return 86 - ad * 158
    return -72 - (ad - 1) * 44
  })

  const rotateY = useTransform(pos, (p) => {
    if (!spatial) return 0
    const d = index - p
    const ad = Math.abs(d)
    if (ad < 0.01) return 0
    const sign = d < 0 ? 1 : -1
    const angle = ad <= 1 ? ad * 42 : Math.min(52, 42 + (ad - 1) * 5)
    return sign * angle
  })

  const scale = useTransform(pos, (p) => {
    const ad = Math.abs(index - p)
    return Math.max(0.7, 1 - ad * 0.11)
  })

  const opacity = useTransform(pos, (p) => {
    const ad = Math.abs(index - p)
    return Math.max(0, 1 - ad * 0.25)
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
        className={`group relative block h-full w-full overflow-hidden rounded-2xl text-left transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isCenter
            ? 'ring-1 ring-white/25 shadow-[0_32px_70px_-14px_rgba(0,0,0,0.92)]'
            : 'ring-1 ring-white/10 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]'
        }`}
      >
        <Art fill eager u={row.uri} name={row.name} zoom={false} cls="h-full w-full rounded-2xl" />
        <div aria-hidden className="cf-specular" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white ring-1 ring-white/15">
          #{index + 1}
        </span>
      </button>
    </motion.div>
  )
}

// Interactive 3D Cover Flow album showcase:
// Virtualized (+/- 4 window -> max 9 DOM elements), continuous MotionValue drag + momentum + spring snap,
// native vertical scroll preserved (`touch-action: pan-y`), and live dominant-color studio ambient lighting.
export default function CoverFlow({ rows, totalMs, onInspect }: Props) {
  const { t, pct, hm } = useI18n()
  const tier = useMotionTier()
  const stageRef = useRef<HTMLDivElement>(null)
  const pos = useMotionValue(0)
  const [active, setActive] = useState(0)
  const [stageWidth, setStageWidth] = useState(720)
  const animRef = useRef<ReturnType<typeof animate> | null>(null)
  const wheelAccum = useRef(0)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    animRef.current?.stop()
    if (wheelTimer.current) clearTimeout(wheelTimer.current)
  }, [])

  const maxIdx = Math.max(0, rows.length - 1)
  const safeActive = Math.min(active, maxIdx)
  const focused = rows[safeActive]
  const artSrc = useArtSrc(focused?.uri ?? '')
  const rgb = useAccent(artSrc)
  useAmbientLight(rgb)

  // Keep active index clamped when filter/limit shrinks the list.
  useEffect(() => {
    if (pos.get() > maxIdx) {
      pos.set(maxIdx)
      setActive(maxIdx)
    }
  }, [maxIdx, pos])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const sync = () => setStageWidth(el.clientWidth || 720)
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
    (target: number) => {
      const clamped = clamp(Math.round(target), 0, maxIdx)
      setActive(clamped)
      animRef.current?.stop()
      if (tier === 'reduced' || Math.abs(clamped - pos.get()) > WINDOW * 2) {
        pos.set(clamped)
        return
      }
      animRef.current = animate(pos, clamped, flowSpring)
    },
    [maxIdx, pos, tier],
  )

  // Responsive card dimensions keeping artwork sharp and legible on both phones and desktops.
  const cardSize = Math.round(clamp(stageWidth * 0.34, 176, 256))
  const spread = Math.round(cardSize * 0.68)
  const wingStep = Math.round(cardSize * 0.36)
  const dragStepPx = Math.max(110, cardSize * 0.62)

  // Pointer/touch swipe with velocity momentum & strict horizontal intent lock (never hijacks vertical scroll).
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
    const instVel = ((e.clientX - d.lastX) / dt) * 1000 // px/s
    d.vel = d.vel * 0.4 + instVel * 0.6
    d.lastX = e.clientX
    d.lastT = now

    let raw = d.startPos - dx / dragStepPx
    // Soft rubber-band resistance past ends
    if (raw < 0) raw *= 0.28
    else if (raw > maxIdx) raw = maxIdx + (raw - maxIdx) * 0.28
    pos.set(raw)
  }

  const endDrag = () => {
    const d = drag.current
    if (!d.down) return
    d.down = false
    if (d.locked === 'h') {
      const momentumOffset = -(d.vel / dragStepPx) * 0.16
      snapTo(pos.get() + clamp(momentumOffset, -3, 3))
    }
  }

  // Horizontal trackpad/wheel support without ever intercepting vertical scroll
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2 || Math.abs(e.deltaX) < 4) return
    wheelAccum.current += e.deltaX
    if (Math.abs(wheelAccum.current) >= 48) {
      const step = wheelAccum.current > 0 ? 1 : -1
      wheelAccum.current = 0
      snapTo(safeActive + step)
    }
    if (wheelTimer.current) clearTimeout(wheelTimer.current)
    wheelTimer.current = setTimeout(() => { wheelAccum.current = 0 }, 160)
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
    <div className="space-y-4">
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
        className="cf-stage amb rounded-3xl border border-white/[0.08] bg-[#0d0d11]/90 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={ambient(rgb)}
      >
        {/* Subtle radial studio spotlight underneath center album (no fake mirror reflections) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
          style={{
            background: 'radial-gradient(50% 90% at 50% 100%, rgb(var(--ar) var(--ag) var(--ab) / 0.22), transparent 72%)',
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

      {/* Focused album info panel + tactile stepper */}
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <motion.div
            key={focused.key}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease }}
            className="min-w-0"
          >
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold tabular-nums text-accent-soft">
                #{safeActive + 1} / {rows.length}
              </span>
              <span className="truncate">{focused.sub}</span>
              <span>·</span>
              <span className="shrink-0">{t('n.tracks', { n: focused.tracks })}</span>
            </div>
            <h2 className="mt-1.5 truncate text-xl font-semibold tracking-tight text-white">{focused.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-neutral-400">
              <span className="font-medium text-neutral-200">{hm(focused.ms)} · {share}%</span>
              <span>{t('n.plays', { n: focused.plays })} · {t('n.streams', { n: focused.streams })}</span>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ListenLinks compact item={{ kind: 'album', name: focused.name, artist: focused.sub }} />
          <AnimatedButton
            onClick={() => onInspect(focused)}
            className="min-h-[40px] rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            {t('al.inspect')}
          </AnimatedButton>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <motion.button
              type="button"
              aria-label={t('al.prev')}
              disabled={safeActive === 0}
              whileTap={safeActive === 0 ? undefined : tapPress}
              transition={{ duration: time.micro, ease }}
              onClick={() => snapTo(safeActive - 1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white transition-colors hover:bg-white/[0.12] disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </motion.button>
            <motion.button
              type="button"
              aria-label={t('al.next')}
              disabled={safeActive >= maxIdx}
              whileTap={safeActive >= maxIdx ? undefined : tapPress}
              transition={{ duration: time.micro, ease }}
              onClick={() => snapTo(safeActive + 1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white transition-colors hover:bg-white/[0.12] disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Scrubbing range slider for effortless jumping across large album collections */}
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
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#e5384b]"
          />
        </div>
      )}
    </div>
  )
}
