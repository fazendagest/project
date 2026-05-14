export function CategoryPlaceholder({ category, uid }: { category: string; uid: string }) {
  const palettes: Record<string, { bg: string; stripe: string; accent: string }> = {
    animais:      { bg: '#E8DCC2', stripe: '#D9C9A6', accent: '#3A2A18' },
    terras:       { bg: '#D9E2C9', stripe: '#C5D2B0', accent: '#3A4226' },
    servicos:     { bg: '#EADFC9', stripe: '#D9C8AC', accent: '#4A3826' },
    maquinas:     { bg: '#D8D3C7', stripe: '#C2BBAA', accent: '#2A2A2A' },
    veterinarios: { bg: '#E2D9C8', stripe: '#CFC3AD', accent: '#1A3A2A' },
    arrendamento: { bg: '#DFD7BE', stripe: '#CCC1A0', accent: '#3A2E18' },
  }
  const p = palettes[category] ?? palettes.animais
  const pid = `p${uid.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg
      viewBox="0 0 320 240"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block' }}
    >
      <defs>
        <pattern id={pid} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="14" height="14" fill={p.bg} />
          <line x1="0" y1="0" x2="0" y2="14" stroke={p.stripe} strokeWidth="6" />
        </pattern>
      </defs>
      <rect width="320" height="240" fill={`url(#${pid})`} />
      <rect x="0" y="160" width="320" height="80" fill={p.stripe} opacity="0.55" />

      {category === 'animais' && (
        <g fill={p.accent} opacity="0.85">
          <ellipse cx="170" cy="172" rx="58" ry="26" />
          <circle cx="120" cy="160" r="18" />
          <rect x="105" y="148" width="4" height="10" />
          <rect x="115" y="148" width="4" height="10" />
          <rect x="146" y="190" width="6" height="22" />
          <rect x="162" y="192" width="6" height="22" />
          <rect x="190" y="192" width="6" height="22" />
          <rect x="206" y="190" width="6" height="22" />
        </g>
      )}
      {category === 'terras' && (
        <g fill={p.accent} opacity="0.7">
          <path d="M0,170 Q80,140 160,165 T320,158 L320,240 L0,240 Z" />
          <rect x="60" y="120" width="3" height="50" />
          <rect x="240" y="125" width="3" height="46" />
          <line x1="60" y1="135" x2="243" y2="138" stroke={p.accent} strokeWidth="1.5" />
          <line x1="60" y1="150" x2="243" y2="152" stroke={p.accent} strokeWidth="1.5" />
        </g>
      )}
      {category === 'maquinas' && (
        <g fill={p.accent} opacity="0.85">
          <rect x="110" y="140" width="90" height="30" rx="4" />
          <rect x="125" y="118" width="40" height="24" rx="2" />
          <circle cx="135" cy="180" r="20" />
          <circle cx="135" cy="180" r="8" fill={p.bg} />
          <circle cx="195" cy="180" r="14" />
          <circle cx="195" cy="180" r="6" fill={p.bg} />
        </g>
      )}
      {category === 'veterinarios' && (
        <g fill={p.accent} opacity="0.85">
          <rect x="148" y="110" width="24" height="70" rx="3" />
          <rect x="125" y="133" width="70" height="24" rx="3" />
        </g>
      )}
      {category === 'arrendamento' && (
        <g fill={p.accent} opacity="0.8">
          <path d="M120,170 L160,135 L200,170 L200,210 L120,210 Z" />
          <rect x="150" y="180" width="20" height="30" fill={p.bg} />
        </g>
      )}
      {category === 'servicos' && (
        <g fill={p.accent} opacity="0.8">
          <rect x="120" y="100" width="80" height="14" rx="2" />
          <rect x="200" y="104" width="20" height="6" />
          <rect x="100" y="100" width="20" height="14" rx="2" />
          <line x1="160" y1="120" x2="160" y2="150" stroke={p.accent} strokeWidth="3" />
        </g>
      )}
    </svg>
  )
}
