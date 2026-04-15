import type { Metadata } from 'next'
import { Instrument_Serif, Outfit, Fira_Code } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const SITE_URL = 'https://terrarium-viewer.com'
const SITE_TITLE = 'Terrarium — Set your React components free'
const SITE_DESCRIPTION =
  'Terrarium is a free, open-source macOS app that instantly previews React components from Claude AI artifacts. Zero config, auto-installed npm dependencies, live reload, and Tailwind CSS v3 built in.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  authors: [{ name: 'Michelle Mayes', url: 'https://michellemayes.me' }],
  creator: 'Michelle Mayes',
  publisher: 'Michelle Mayes',
  applicationName: 'Terrarium',
  category: 'technology',
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Terrarium',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    creator: '@michellemayes',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Search engine ownership verification.
  // Paste the verification token from each console here. DNS verification
  // (set up via Vercel DNS) is preferred where available because it doesn't
  // pollute the HTML head, but the meta-tag fallback is fine.
  verification: {
    // google: 'paste-from-https://search.google.com/search-console',
    // yandex: 'paste-from-https://webmaster.yandex.com',
    // other: { 'msvalidate.01': 'paste-from-https://www.bing.com/webmasters' },
  },
}

// Static, fully-controlled JSON-LD. No user input, no injection surface.
// `dangerouslySetInnerHTML` is the Next.js-documented pattern for JSON-LD:
// https://nextjs.org/docs/app/guides/json-ld
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': SITE_URL + '/#software',
      name: 'Terrarium',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: 'DeveloperApplication',
      applicationSubCategory: 'ReactComponentPreview',
      operatingSystem: 'macOS 12+',
      softwareVersion: '1.0.0',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      downloadUrl: 'https://github.com/michellemayes/terrarium/releases/latest',
      installUrl: 'https://github.com/michellemayes/terrarium/releases/latest',
      releaseNotes: 'https://github.com/michellemayes/terrarium/blob/master/CHANGELOG.md',
      license: 'https://github.com/michellemayes/terrarium/blob/master/LICENSE',
      codeRepository: 'https://github.com/michellemayes/terrarium',
      programmingLanguage: ['TypeScript', 'Rust'],
      featureList: [
        'Zero-config React component preview',
        'Automatic npm dependency installation',
        'Live reload on file save',
        'Built-in Tailwind CSS v3',
        'JSX and TSX support',
        'Claude Code integration',
      ],
      author: {
        '@id': SITE_URL + '/#author',
      },
    },
    {
      '@type': 'WebSite',
      '@id': SITE_URL + '/#website',
      url: SITE_URL,
      name: 'Terrarium',
      description: SITE_DESCRIPTION,
      publisher: {
        '@id': SITE_URL + '/#author',
      },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Person',
      '@id': SITE_URL + '/#author',
      name: 'Michelle Mayes',
      url: 'https://michellemayes.me',
      sameAs: ['https://github.com/michellemayes'],
    },
  ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
