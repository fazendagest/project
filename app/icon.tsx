import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: '#166534',
        borderRadius: 7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 19,
          height: 19,
          background: 'white',
          borderRadius: '0 50% 0 50%',
        }}
      />
    </div>,
    { width: 32, height: 32 }
  )
}
