import { PawPrint, Mountain, Wrench, Tractor, Stethoscope, Home } from 'lucide-react'

const CONFIGS: Record<string, { bg: string; color: string; Icon: React.ComponentType<{ style?: React.CSSProperties }> }> = {
  animais:      { bg: '#EDE5D0', color: '#7A5C30', Icon: PawPrint },
  terras:       { bg: '#DDE8D0', color: '#3A5A30', Icon: Mountain },
  servicos:     { bg: '#E8E0D0', color: '#5A4030', Icon: Wrench },
  maquinas:     { bg: '#D8D8D0', color: '#404040', Icon: Tractor },
  veterinarios: { bg: '#E8D8D8', color: '#7A3030', Icon: Stethoscope },
  arrendamento: { bg: '#E8E0C8', color: '#5A4820', Icon: Home },
}

export function CategoryPlaceholder({ category }: { category: string }) {
  const cfg = CONFIGS[category] ?? CONFIGS.animais
  const Icon = cfg.Icon
  return (
    <div
      style={{ background: cfg.bg, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon style={{ color: cfg.color, width: 48, height: 48, opacity: 0.45 }} />
    </div>
  )
}
