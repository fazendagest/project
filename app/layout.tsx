import type { Metadata } from 'next'
import { Work_Sans, Source_Serif_4 } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '600', '700'] })
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FazendaGest',
  description: 'Sistema completo de gestão de fazenda',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FazendaGest',
  },
  themeColor: '#0F4A2D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${workSans.variable} ${sourceSerif.variable} font-sans`}>
        {children}
        <Toaster richColors position="top-right" />
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
            })
          }
        `}</Script>
      </body>
    </html>
  )
}
