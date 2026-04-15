import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt =
  'Terrarium — Set your React components free. Instantly preview React components from Claude AI artifacts on macOS.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0a0514',
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 50% 40%, #2a1050 0%, #0a0514 60%), radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.35) 0%, transparent 45%), radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.2) 0%, transparent 50%)',
          fontFamily: 'sans-serif',
          color: '#ffffff',
          padding: '72px 80px',
        }}
      >
        {/* Terrarium icon */}
        <div style={{ display: 'flex', marginBottom: 40 }}>
          <svg width="152" height="152" viewBox="0 0 512 512" fill="none">
            <ellipse cx="256" cy="280" rx="170" ry="190" fill="#4a2080" opacity="0.5" />
            <path d="M256 52 L100 240 L128 395 L256 462 L384 395 L412 240Z" fill="#1e1040" />
            <path d="M256 52 L100 240 L256 240Z" fill="#c4b5fd" opacity="0.55" stroke="#a88de0" strokeWidth="3" strokeLinejoin="round" />
            <path d="M256 52 L256 240 L412 240Z" fill="#a78bfa" opacity="0.5" stroke="#a88de0" strokeWidth="3" strokeLinejoin="round" />
            <path d="M100 240 L128 395 L256 462 L256 240Z" fill="#8b5cf6" opacity="0.55" stroke="#a88de0" strokeWidth="3" strokeLinejoin="round" />
            <path d="M256 240 L256 462 L384 395 L412 240Z" fill="#7c3aed" opacity="0.55" stroke="#a88de0" strokeWidth="3" strokeLinejoin="round" />
            <path d="M205 280 L168 318 L205 356" fill="none" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M272 274 L240 362" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
            <path d="M307 280 L344 318 L307 356" fill="none" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Headline line 1 */}
        <div
          style={{
            display: 'flex',
            fontSize: 88,
            fontWeight: 400,
            fontStyle: 'italic',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#ffffff',
          }}
        >
          Set your React components
        </div>

        {/* Headline line 2 */}
        <div
          style={{
            display: 'flex',
            fontSize: 88,
            fontWeight: 400,
            fontStyle: 'italic',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginTop: 4,
            marginBottom: 28,
            color: '#f0abfc',
          }}
        >
          free
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 400,
            color: '#c4b5fd',
            marginTop: 12,
          }}
        >
          Instantly preview React components from Claude
        </div>

        {/* Meta line */}
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            fontWeight: 400,
            color: '#9080b0',
            marginTop: 32,
          }}
        >
          terrarium-viewer.com  ·  Free for macOS
        </div>
      </div>
    ),
    {
      ...size,
    },
  )
}
