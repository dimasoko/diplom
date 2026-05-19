import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useScrollStore } from '../../store/useScrollStore'

const HEADER_HEIGHT = 86
const START_LOGO_WIDTH = 320
const END_LOGO_WIDTH = 88

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function AnimatedLogo() {
  const location = useLocation()
  const progress = useScrollStore((state) => state.scrollProgress)
  const isHome = location.pathname === '/'

  const effectiveProgress = isHome ? progress : 1
  const logoProgress = Math.pow(effectiveProgress, 2)
  const headerCenterY = HEADER_HEIGHT / 2
  const startTop = window.innerHeight * 0.62

  const top = lerp(startTop, headerCenterY, logoProgress)
  const width = lerp(
    clamp(START_LOGO_WIDTH, 180, 320),
    clamp(END_LOGO_WIDTH, 72, 88),
    logoProgress,
  )
  const opacity = isHome || effectiveProgress === 1 ? 1 : 0

  const style = useMemo(
    () => ({
      position: 'fixed' as const,
      top: `${top}px`,
      left: '50vw',
      transform: 'translate(-50%, -50%)',
      width: `clamp(72px, ${width}px, 320px)`,
      transition: 'none',
      willChange: 'top, width, transform',
      zIndex: 60,
      pointerEvents: 'auto' as const,
      opacity,
    }),
    [opacity, top, width],
  )

  return (
    <Link to="/" style={style} aria-label="На главную">
      <img src="/assets/base-logo.jpg" alt="we are BASE coffee" className="h-auto w-full" draggable={false} />
    </Link>
  )
}
