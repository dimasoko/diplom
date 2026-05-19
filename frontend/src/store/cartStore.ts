import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CartItem = {
  menu_item_id: string
  menu_item_name?: string
  size: 'S' | 'M' | 'L'
  addon_ids: string[]
  addon_names?: string[] 
  quantity: number
  calculated_price: number
}

type CartState = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  updateItem: (index: number, item: CartItem) => void
  removeItem: (index: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [...state.items, item],
        })),
      updateItem: (index, item) =>
        set((state) => ({
          items: state.items.map((current, currentIndex) => (currentIndex === index ? item : current)),
        })),
      removeItem: (index) =>
        set((state) => ({
          items: state.items.filter((_, itemIndex) => itemIndex !== index),
        })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
