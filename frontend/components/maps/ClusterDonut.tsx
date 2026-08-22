const STROKE = 5

export function clusterSize(total: number): number {
  if (total < 10) return 44
  if (total < 50) return 52
  return 60
}

export default function ClusterDonut({
  total,
  visited,
  visitedColor,
  wishlistColor,
  fill,
  text,
  hovered = false,
}: {
  total: number
  visited: number
  visitedColor: string
  wishlistColor: string
  fill: string
  text: string
  hovered?: boolean
}) {
  const size = clusterSize(total)
  const radius = (size - STROKE) / 2 - 1
  const circumference = 2 * Math.PI * radius
  const visitedArc = total > 0 ? (visited / total) * circumference : 0
  const label = total > 99 ? '99+' : String(total)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.32))',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        transformOrigin: 'center',
        transition: 'transform 140ms ease-out',
      }}
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill={fill} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={wishlistColor} strokeWidth={STROKE} />
      {visited > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={visitedColor}
          strokeWidth={STROKE}
          strokeDasharray={`${visitedArc} ${circumference - visitedArc}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill={text}
        fontSize={total > 99 ? 13 : 15}
        fontWeight={700}
        fontFamily="inherit"
      >
        {label}
      </text>
    </svg>
  )
}
