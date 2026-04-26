import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

function cowIcon(s: number) {
  const p = (v: number) => Math.round(s * v)
  return (
    <div style={{ width: s, height: s, background: '#166534', borderRadius: p(0.18), display: 'flex', position: 'relative' }}>
      <div style={{ position: 'absolute', width: p(0.12), height: p(0.18), background: '#c9956b', borderRadius: '50% 50% 20% 50%', top: p(0.10), left: p(0.20), transform: 'rotate(-18deg)' }} />
      <div style={{ position: 'absolute', width: p(0.12), height: p(0.18), background: '#c9956b', borderRadius: '50% 50% 50% 20%', top: p(0.10), right: p(0.20), transform: 'rotate(18deg)' }} />
      <div style={{ position: 'absolute', width: p(0.16), height: p(0.21), background: 'white', borderRadius: '50%', top: p(0.25), left: p(0.10) }} />
      <div style={{ position: 'absolute', width: p(0.09), height: p(0.13), background: '#f3d5b5', borderRadius: '50%', top: p(0.29), left: p(0.135) }} />
      <div style={{ position: 'absolute', width: p(0.16), height: p(0.21), background: 'white', borderRadius: '50%', top: p(0.25), right: p(0.10) }} />
      <div style={{ position: 'absolute', width: p(0.09), height: p(0.13), background: '#f3d5b5', borderRadius: '50%', top: p(0.29), right: p(0.135) }} />
      <div style={{ position: 'absolute', width: p(0.56), height: p(0.65), background: 'white', borderRadius: '45% 45% 42% 42%', top: p(0.18), left: p(0.22) }} />
      <div style={{ position: 'absolute', width: p(0.11), height: p(0.11), background: '#1a1a1a', borderRadius: '50%', top: p(0.34), left: p(0.27) }} />
      <div style={{ position: 'absolute', width: p(0.04), height: p(0.04), background: 'white', borderRadius: '50%', top: p(0.345), left: p(0.30) }} />
      <div style={{ position: 'absolute', width: p(0.11), height: p(0.11), background: '#1a1a1a', borderRadius: '50%', top: p(0.34), right: p(0.27) }} />
      <div style={{ position: 'absolute', width: p(0.04), height: p(0.04), background: 'white', borderRadius: '50%', top: p(0.345), right: p(0.30) }} />
      <div style={{ position: 'absolute', width: p(0.36), height: p(0.24), background: '#f3d5b5', borderRadius: '45%', top: p(0.61), left: p(0.32) }} />
      <div style={{ position: 'absolute', width: p(0.08), height: p(0.07), background: '#c9956b', borderRadius: '50%', top: p(0.66), left: p(0.35) }} />
      <div style={{ position: 'absolute', width: p(0.08), height: p(0.07), background: '#c9956b', borderRadius: '50%', top: p(0.66), right: p(0.35) }} />
    </div>
  )
}

export default function Icon() {
  return new ImageResponse(cowIcon(32), { width: 32, height: 32 })
}
