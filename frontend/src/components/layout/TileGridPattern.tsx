import { useId, type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

const TILE_SIZE = 40
const TILE_FILL = '#ffffff'
const TILE_LINE = '#2B2D9E'

type TileGridPatternProps = {
  className?: string
  children?: ReactNode
}

/**
 * Сетка 40×40 px (1px линии primary) — визуально как .bg-tile-pattern,
 * но через SVG <pattern> в DOM для корректного экспорта в Figma.
 */
export default function TileGridPattern({ className, children }: TileGridPatternProps) {
  const patternId = useId().replace(/:/g, '')

  return (
    <div className={twMerge('relative bg-white', className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id={patternId} width={TILE_SIZE} height={TILE_SIZE} patternUnits="userSpaceOnUse">
            <rect width={TILE_SIZE} height={TILE_SIZE} fill={TILE_FILL} />
            <path
              d={`M0 0 H${TILE_SIZE} M0 0 V${TILE_SIZE}`}
              stroke={TILE_LINE}
              strokeWidth={1}
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  )
}
