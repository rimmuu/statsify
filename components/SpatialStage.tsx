'use client'
import { useContext, useEffect, useLayoutEffect, useRef, useState, type ContextType, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { classifyTransition, pageEnterFrom, pageExitTo, pageRest, useMotionTier, type RouteTransition } from '@/lib/motion'

type Layer = { path: string; node: ReactNode; context: ContextType<typeof LayoutRouterContext> }
type Navigation = { path: string; transition: RouteTransition | null; outgoing: Layer | null }
const firstTransition: RouteTransition = { kind: 'tab', dir: 1 }

export default function SpatialStage({ pathname, children }: { pathname: string; children: ReactNode }) {
  const tier = useMotionTier()
  const context = useContext(LayoutRouterContext)
  const committed = useRef<Layer>({ path: pathname, node: children, context })
  const [nav, setNav] = useState<Navigation>({ path: pathname, transition: null, outgoing: null })

  // Keep the outgoing route's existing component instance and its matching Next.js router context.
  // Mobile and reduced-motion navigation mount only the destination, even during a transition.
  if (nav.path !== pathname) {
    setNav({
      path: pathname,
      transition: classifyTransition(nav.path, pathname),
      outgoing: tier === 'full' ? committed.current : null,
    })
  }
  useLayoutEffect(() => {
    committed.current = { path: pathname, node: children, context }
  }, [pathname, children, context])

  useEffect(() => {
    const old = nav.outgoing
    if (!old) return
    const timer = window.setTimeout(() => {
      setNav(current => current.outgoing === old ? { ...current, outgoing: null } : current)
    }, 380)
    return () => window.clearTimeout(timer)
  }, [nav.outgoing])

  const live = { path: pathname, node: children, context }
  const layers = tier === 'full' && nav.outgoing && nav.outgoing.path !== pathname ? [nav.outgoing, live] : [live]
  const transition = nav.transition ?? firstTransition
  return (
    <div className="spatial-stage" data-motion={tier}>
      {layers.map(layer => {
        const leaving = layer === nav.outgoing
        return (
          <motion.div
            key={layer.path}
            ref={element => { if (element) element.inert = leaving }}
            aria-hidden={leaving || undefined}
            className="spatial-page w-full"
            initial={leaving || !nav.transition || tier === 'reduced' ? false : pageEnterFrom(transition, tier)}
            animate={leaving ? pageExitTo(transition, tier) : pageRest(transition, tier)}
            style={{
              position: leaving ? 'absolute' : 'relative',
              inset: leaving ? '0 0 auto' : undefined,
              zIndex: leaving ? 1 : 2,
              pointerEvents: leaving ? 'none' : undefined,
              transformOrigin: '50% 22%',
            }}
          >
            <LayoutRouterContext.Provider value={layer.context}>{layer.node}</LayoutRouterContext.Provider>
          </motion.div>
        )
      })}
    </div>
  )
}
