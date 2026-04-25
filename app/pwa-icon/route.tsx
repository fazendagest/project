import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

function leafIcon(size: number) {
  const leaf = Math.floor(size * 0.58)
  const radius = Math.floor(size * 0.22)
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#166534',
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: leaf,
          height: leaf,
          background: 'white',
          borderRadius: '0 50% 0 50%',
        }}
      />
    </div>
  )
}

export function GET(request: NextRequest) {
  const size = parseInt(new URL(request.url).searchParams.get('size') ?? '192')
  const s = [192, 512].includes(size) ? size : 192
  return new ImageResponse(leafIcon(s), { width: s, height: s })
}
