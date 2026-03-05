import type { Metadata } from 'next'
import { Instrument_Serif, Outfit, Fira_Code } from 'next/font/google'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Terrarium — Set your React components free',
  description:
    'Instantly preview React components from Claude AI artifacts. Zero config, live reload, Tailwind CSS built-in. A tiny terrarium for macOS.',
  keywords: [
    'react',
    'tsx',
    'jsx',
    'preview',
    'macos',
    'claude',
    'ai',
    'component viewer',
    'terrarium',
  ],
  openGraph: {
    title: 'Terrarium — Set your React components free',
    description:
      'Instantly preview React components from Claude AI artifacts. Zero config, live reload, Tailwind built-in.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terrarium — Set your React components free',
    description:
      'Instantly preview React components from Claude AI artifacts.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${outfit.variable} ${firaCode.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
