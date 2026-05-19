import { useEffect } from 'react'
import { useScrollStore } from '../store/useScrollStore'

export function useHeroScroll() {
  const setScrollY = useScrollStore((state) => state.setScrollY)
  const setScrollProgress = useScrollStore((state) => state.setScrollProgress)

  useEffect(() => {
    const animationDistance = 200

    const handleScroll = () => {
      const y = window.scrollY
      const progress = Math.min(y / animationDistance, 1)
      setScrollY(y)
      setScrollProgress(progress)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      setScrollProgress(0)
    }
  }, [setScrollProgress, setScrollY])
}
