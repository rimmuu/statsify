'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useReducedMotion } from 'motion/react'
import { useI18n } from '@/lib/i18n'
import VinylStage from './VinylStage'

const INTRO_KEY = 'statsify.intro.v3'

export function triggerIntroReplay() {
  try {
    localStorage.removeItem(INTRO_KEY)
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('statsify:replay-intro'))
  }
}

// Lightweight, skippable ~2.3s cinematic opening.
// Plays once per returning user (replayable from Settings), never blocks data loading,
// and skips automatically under prefers-reduced-motion.
export default function CinematicIntro() {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const finish = useCallback(() => {
    tlRef.current?.kill()
    tlRef.current = null
    try {
      localStorage.setItem(INTRO_KEY, '1')
    } catch {}
    setOpen(false)
  }, [])

  useEffect(() => {
    if (reduced) return
    let seen = false
    try {
      seen = localStorage.getItem(INTRO_KEY) === '1'
    } catch {}
    if (!seen) setOpen(true)

    const onReplay = () => {
      if (!reduced) setOpen(true)
    }
    window.addEventListener('statsify:replay-intro', onReplay)
    return () => window.removeEventListener('statsify:replay-intro', onReplay)
  }, [reduced])

  useEffect(() => {
    if (!open || !rootRef.current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        finish()
      }
    }
    window.addEventListener('keydown', onKey)

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish })
      tlRef.current = tl
      tl.fromTo(
        '[data-intro-vinyl]',
        { opacity: 0, scale: 0.78, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.85, ease: 'power3.out' },
      )
        .fromTo(
          '[data-intro-word]',
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', stagger: 0.08 },
          '-=0.45',
        )
        .fromTo(
          '[data-intro-line]',
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.55, ease: 'power2.out' },
          '-=0.35',
        )
        .to({}, { duration: 0.65 })
        .to(rootRef.current, {
          opacity: 0,
          scale: 1.03,
          duration: 0.42,
          ease: 'power2.inOut',
        })
    }, rootRef)

    return () => {
      window.removeEventListener('keydown', onKey)
      ctx.revert()
      tlRef.current = null
    }
  }, [open, finish])

  if (!open || reduced) return null

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('intro.label')}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden bg-[#080808] px-6 text-[#F5F5F5]"
    >
      {/* Subtle obsidian-crimson atmospheric wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 45% at 50% 42%, rgba(250, 51, 79, 0.16) 0%, rgba(8, 8, 8, 0) 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div data-intro-vinyl className="mb-8 w-44 sm:w-56">
          <VinylStage forceCss spinning interactive={false} className="w-full" />
        </div>

        <div className="overflow-hidden">
          <h1
            data-intro-word
            className="display-editorial text-6xl tracking-[-0.025em] text-[#F5F5F5] sm:text-7xl"
          >
            Statsify<span className="text-[#FA334F]">.</span>
          </h1>
        </div>

        <div
          data-intro-line
          className="my-4 h-px w-24 origin-center bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        <p data-intro-word className="text-sm tracking-[0.06em] text-[#999999]">
          {t('intro.sub')}
        </p>
      </div>

      <button
        type="button"
        onClick={finish}
        className="pressable fixed right-5 top-[max(1.25rem,env(safe-area-inset-top))] z-20 inline-flex min-h-[44px] items-center rounded-full border border-white/15 bg-white/[0.06] px-4 text-xs font-medium tracking-wide text-[#F5F5F5]/85 hover:bg-white/[0.12] hover:text-white"
      >
        {t('intro.skip')}
      </button>
    </div>
  )
}
