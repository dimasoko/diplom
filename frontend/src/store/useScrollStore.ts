import { create } from 'zustand'

interface ScrollState {
  scrollY: number
  scrollProgress: number
  setScrollY: (y: number) => void
  setScrollProgress: (progress: number) => void
}

export const useScrollStore = create<ScrollState>((set) => ({
  scrollY: 0,
  scrollProgress: 0,
  setScrollY: (y) => set({ scrollY: y }),
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
}))
