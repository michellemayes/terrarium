import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        surface: '#0f0a1a',
        elevated: '#1a1228',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'sparkle': 'sparkle 3s ease-in-out infinite',
        'sparkle-delayed': 'sparkle 3s ease-in-out 1s infinite',
        'sparkle-slow': 'sparkle 4s ease-in-out 0.5s infinite',
        'fade-up': 'fade-up 0.8s ease-out both',
        'fade-up-1': 'fade-up 0.8s ease-out 0.1s both',
        'fade-up-2': 'fade-up 0.8s ease-out 0.2s both',
        'fade-up-3': 'fade-up 0.8s ease-out 0.35s both',
        'fade-up-4': 'fade-up 0.8s ease-out 0.5s both',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
export default config
