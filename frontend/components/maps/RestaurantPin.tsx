import { cuisineIconSvg } from '@/constants/CuisineMapIcons'

const GLYPH_VIEWBOX = 256

export default function RestaurantPin({
  cuisine,
  background,
  ring = '#ffffff',
  size = 38,
  glyphSize = 20,
  selected = false,
}: {
  cuisine: string
  background: string
  ring?: string
  size?: number
  glyphSize?: number
  selected?: boolean
}) {
  const radius = size / 2 - 1
  const scale = glyphSize / GLYPH_VIEWBOX
  const inset = (size - glyphSize) / 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        display: 'block',
        filter: selected
          ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))'
          : 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
        transform: selected ? 'scale(1.12)' : 'scale(1)',
        transformOrigin: 'center',
        transition: 'transform 140ms ease-out, filter 140ms ease-out',
      }}
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill={background} stroke={ring} strokeWidth={2} />
      <g transform={`translate(${inset} ${inset}) scale(${scale})`}>
        <path d={cuisineIconSvg(cuisine)} fill="#ffffff" />
      </g>
    </svg>
  )
}
