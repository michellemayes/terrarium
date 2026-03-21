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
        base: 'var(--color-base)',
        deep: 'var(--color-deep)',
        surface: '#0f0a1a',
        elevated: '#1a1228',
        brand: {
          DEFAULT: 'var(--color-brand)',
          light: 'var(--color-brand-light)',
          dark: 'var(--color-brand-dark)',
          soft: 'var(--color-brand-soft)',
        },
        accent: {
          amber: 'var(--color-accent-amber)',
          pink: 'var(--color-accent-pink)',
        },
      },
      textColor: {
        bright: 'var(--color-text-bright)',
        accent: 'var(--color-text-accent)',
        muted: 'var(--color-text-muted)',
        dim: 'var(--color-text-dim)',
        subtle: 'var(--color-text-subtle)',
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
        'scroll-hint': 'scroll-hint 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out both',
        'blink': 'blink 1s steps(2) infinite',
        'boot-progress': 'boot-progress 0.8s cubic-bezier(0.25, 1, 0.5, 1) both',
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
        'scroll-hint': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '50%': { transform: 'translateY(4px)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'boot-progress': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}
export default config
