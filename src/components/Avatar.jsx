import { useId } from 'react'

// Avatar ilustrado estilo clay mientras no haya foto real de la instructora
export default function Avatar({ look, className = '' }) {
  const id = useId().replace(/:/g, '')
  const { skin, hair, hairColor, top } = look
  const g = (n) => `url(#${id}-${n})`

  return (
    <svg className={`avatar ${className}`} viewBox="0 0 200 240" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-skin`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={skin} stopOpacity="0.82" />
          <stop offset="0.35" stopColor={skin} />
          <stop offset="1" stopColor={skin} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`${id}-hair`} cx="35%" cy="25%" r="80%">
          <stop offset="0" stopColor={hairColor} stopOpacity="0.85" />
          <stop offset="0.4" stopColor={hairColor} />
          <stop offset="1" stopColor={hairColor} />
        </radialGradient>
        <radialGradient id={`${id}-top`} cx="35%" cy="20%" r="90%">
          <stop offset="0" stopColor={top} stopOpacity="0.8" />
          <stop offset="0.45" stopColor={top} />
          <stop offset="1" stopColor={top} />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#3b2d27" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter={`url(#${id}-soft)`}>
        {hair === 'ponytail' && (
          <path d="M132 70 C178 78 182 150 150 178 C162 138 152 104 124 92 Z" fill={g('hair')} />
        )}
        {hair === 'long' && (
          <path d="M56 96 C50 150 58 180 72 190 L128 190 C142 180 150 150 144 96 Z" fill={g('hair')} />
        )}
        <path d="M24 240 C24 192 58 168 100 168 C142 168 176 192 176 240 Z" fill={g('top')} />
        <rect x="85" y="128" width="30" height="52" rx="14" fill={skin} />
        <path d="M78 170 C86 186 114 186 122 170 Z" fill={skin} />
        <ellipse cx="100" cy="102" rx="40" ry="46" fill={g('skin')} />
        {hair === 'bun' && <circle cx="100" cy="44" r="21" fill={g('hair')} />}
        <path
          d={
            hair === 'long'
              ? 'M58 112 C52 62 80 52 100 52 C124 52 150 62 142 112 C140 90 128 76 104 70 C96 84 74 92 58 112 Z'
              : 'M60 102 C58 62 80 54 100 54 C122 54 144 62 140 102 C134 84 120 74 100 74 C80 74 66 84 60 102 Z'
          }
          fill={g('hair')}
        />
        <path d="M82 104 q6 -6 12 0 M106 104 q6 -6 12 0" fill="none" stroke="#3b2d27" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M90 124 q10 9 20 0" fill="none" stroke="#3b2d27" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="76" cy="118" r="7" fill="#e79a8f" opacity="0.45" />
        <circle cx="124" cy="118" r="7" fill="#e79a8f" opacity="0.45" />
      </g>
    </svg>
  )
}
