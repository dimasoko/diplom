import { useEffect, useRef, useState } from 'react'
import { useHeroScroll } from '../../hooks/useHeroScroll'
import { useScrollStore } from '../../store/useScrollStore'

const CURSOR_GIFS = [
  '/assets/cursor-gifs/IMG_2264.gif',
  '/assets/cursor-gifs/hero-1.gif',
  '/assets/cursor-gifs/hero-2.gif',
  '/assets/cursor-gifs/hero-3.gif',
  '/assets/cursor-gifs/hero-4.gif',
]

const CURSOR_LERP = 0.16

function shuffle<T>(items: T[]): T[] {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = list[i]
    list[i] = list[j]
    list[j] = temp
  }
  return list
}

export default function HeroSection() {
  useHeroScroll()
  const progress = useScrollStore((state) => state.scrollProgress)
  const scrollY = useScrollStore((state) => state.scrollY)
  const scrollHintOpacity = Math.max(1 - progress * 4, 0)
  const scrollHintTranslateY = progress * 18
  const utilityOpacity = Math.max(1 - progress * 1.7, 0)
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900
  const headerHeight = 86
  const cursorHideScrollY = Math.max(viewportHeight - headerHeight, 0)

  const sectionRef = useRef<HTMLElement | null>(null)
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const canShowCursorRef = useRef(false)
  const pointerInsideRef = useRef(false)

  const [isDesktop, setIsDesktop] = useState(false)
  const [isPointerInside, setIsPointerInside] = useState(false)
  const [activeGif, setActiveGif] = useState<string | null>(null)
  const [isGifReady, setIsGifReady] = useState(false)

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
    const update = () => setIsDesktop(media.matches)
    update()

    media.addEventListener('change', update)
    return () => {
      media.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (!isDesktop) {
      setActiveGif(null)
      setIsGifReady(false)
      return
    }

    let cancelled = false
    const candidates = shuffle(CURSOR_GIFS)

    const loadNext = (index: number) => {
      if (index >= candidates.length) {
        if (!cancelled) {
          setActiveGif(null)
          setIsGifReady(false)
        }
        return
      }

      const src = candidates[index]
      const image = new Image()

      image.onload = () => {
        if (cancelled) {
          return
        }
        setActiveGif(src)
        setIsGifReady(true)
      }

      image.onerror = () => {
        if (cancelled) {
          return
        }
        loadNext(index + 1)
      }

      image.src = src
    }

    setIsGifReady(false)
    loadNext(0)

    return () => {
      cancelled = true
    }
  }, [isDesktop])

  useEffect(() => {
    canShowCursorRef.current = isDesktop && scrollY < cursorHideScrollY
    if (!canShowCursorRef.current && pointerInsideRef.current) {
      pointerInsideRef.current = false
      setIsPointerInside(false)
    }
  }, [cursorHideScrollY, isDesktop, scrollY])

  useEffect(() => {
    const section = sectionRef.current

    if (!section || !isDesktop) {
      return
    }

    const animate = () => {
      const cursor = cursorRef.current
      if (cursor) {
        currentRef.current.x += (targetRef.current.x - currentRef.current.x) * CURSOR_LERP
        currentRef.current.y += (targetRef.current.y - currentRef.current.y) * CURSOR_LERP
        cursor.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0) translate(-50%, -50%)`
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    const onWindowMouseMove = (event: MouseEvent) => {
      const rect = section.getBoundingClientRect()
      const headerTop = Math.max(viewportHeight - headerHeight - scrollY, 0)
      const isInsideSection =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      const isAboveHeader = event.clientY < headerTop
      const shouldShow = canShowCursorRef.current && isInsideSection && isAboveHeader

      if (shouldShow) {
        const next = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }
        targetRef.current = next
        if (!pointerInsideRef.current) {
          currentRef.current = next
          pointerInsideRef.current = true
          setIsPointerInside(true)
        }
      } else if (pointerInsideRef.current) {
        pointerInsideRef.current = false
        setIsPointerInside(false)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    window.addEventListener('mousemove', onWindowMouseMove)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      window.removeEventListener('mousemove', onWindowMouseMove)
    }
  }, [headerHeight, isDesktop, scrollY, viewportHeight])

  const canShowCursor = isDesktop && scrollY < cursorHideScrollY

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-white">
      {isDesktop ? (
        <div
          ref={cursorRef}
          className={`pointer-events-none absolute left-0 top-0 z-[61] h-28 w-44 transition-opacity duration-200 ${
            canShowCursor && isPointerInside ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="relative h-full w-full overflow-hidden border border-white/70 bg-white/25 backdrop-blur-xl">
            {activeGif && isGifReady ? (
              <img src={activeGif} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div className="h-full w-full animate-pulse bg-gradient-to-br from-white/60 via-white/30 to-white/10" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 to-white/5" />
          </div>
        </div>
      ) : null}

      <div className="absolute left-0 top-0 z-[70] w-full px-4 pt-2 text-left font-display uppercase leading-none tracking-[0.06em] text-text-main sm:px-6 sm:pt-3">
        <span className="font-display text-[16vw] sm:hidden">
          кофе
          <br />
          люди
          <br />
          культура
        </span>
        <span className="hidden font-display sm:inline text-[12vw] lg:text-[8vw]">кофе&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;люди&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;культура</span>
      </div>

      <div
        className="absolute inset-x-0 top-[72vw] z-[70] mx-auto flex w-full max-w-3xl items-center justify-between px-5 sm:left-1/2 sm:top-[20vw] sm:-translate-x-1/2 sm:px-8 lg:top-[16vw]"
        style={{ opacity: utilityOpacity, willChange: 'opacity' }}
      >
        <button
          type="button"
          onClick={() => scrollToSection('map-section')}
          className="text-[13px] uppercase tracking-[0.06em] text-text-main/90 transition-colors hover:text-primary"
        >
          Где мы?
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('gallery-section')}
          className="text-[13px] py-2 uppercase tracking-[0.06em] text-text-main/90 transition-colors hover:text-primary"
        >
          Посмотреть интерьер
        </button>
      </div>

      <div
        className="absolute bottom-[36%] left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 text-sm text-text-main/80"
        style={{
          opacity: scrollHintOpacity,
          transform: `translate(-50%, ${scrollHintTranslateY}px)`,
          willChange: 'transform, opacity',
        }}
      >
      </div>
    </section>
  )
}
