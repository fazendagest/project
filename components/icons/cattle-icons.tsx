// Ícones de traço no estilo do lucide (24 x 24, traço da cor do texto), para o menu.
// O lucide não tem vaca; o CowIcon (logo colorido) não serve para o menu.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Cabeça de vaca de frente: chifres, orelhas, olhos e focinho. */
function CowHead({ horns = true }: { horns?: boolean }) {
  return (
    <>
      {horns && <path d="M8.5 6.5C7.5 5 7.6 3.6 8.6 2.5M15.5 6.5c1-1.5.9-2.9-.1-4" />}
      <path d="M7 9 3 8c.2 1.8 1.6 3 4 3M17 9l4-1c-.2 1.8-1.6 3-4 3" />
      <path d="M7 14V9.5C7 7.6 9.2 6 12 6s5 1.6 5 3.5V14" />
      <rect x="6" y="14" width="12" height="7.5" rx="3.75" />
      <path d="M9.5 11h.01M14.5 11h.01M10 17.75h.01M14 17.75h.01" />
    </>
  )
}

/** Animais: cabeça de vaca. */
export function CowLineIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <CowHead />
    </svg>
  )
}

/** Reprodução: vaca com o bezerro ao lado (bezerro menor e sem chifre). */
export function CowCalfIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <g transform="translate(-1.5 -1) scale(0.76)" strokeWidth={2.5}>
        <CowHead />
      </g>
      <g transform="translate(12.6 11.8) scale(0.5)" strokeWidth={3.6}>
        <CowHead horns={false} />
      </g>
    </svg>
  )
}
