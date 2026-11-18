/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,svelte}",
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Theme colors are dynamically set by CSS variables for theme switching
        'primary': 'var(--color-primary)',
        'secondary': 'var(--color-secondary)',
        'accent': 'var(--color-accent)',
        'warning': 'var(--color-warning)',
        'danger': 'var(--color-danger)',
        'arcade-bg': '#1a1a1a', // Kept for simplicity in some components
      },
      fontFamily: {
        'display': ['"Russo One"', 'system-ui', '-apple-system', 'sans-serif'],
        'body': ['"JetBrains Mono"', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        'sans': ['"JetBrains Mono"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Balanced typographic scale for Russo One + JetBrains Mono
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.4' }],    // 12px
        'sm': ['0.875rem', { lineHeight: '1.4' }],   // 14px
        'base': ['1rem', { lineHeight: '1.45' }],    // 16px
        'lg': ['1.125rem', { lineHeight: '1.35' }],  // 18px
        'xl': ['1.35rem', { lineHeight: '1.3' }],    // 21.6px
        '2xl': ['1.65rem', { lineHeight: '1.2' }],   // 26.4px
        '3xl': ['2rem', { lineHeight: '1.15' }],     // 32px
        '4xl': ['2.65rem', { lineHeight: '1.1' }],   // 42.4px
        '5xl': ['3.4rem', { lineHeight: '1.08' }],   // 54.4px
      },
      // Standardized border radius values.
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },
      animation: {
        'glitch': 'glitch 0.25s infinite',
        'flicker': 'flicker 1.2s infinite',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-3px, 3px)' },
          '40%': { transform: 'translate(-3px, -3px)' },
          '60%': { transform: 'translate(3px, 3px)' },
          '80%': { transform: 'translate(3px, -3px)' },
          '100%': { transform: 'translate(0)' },
        },
        flicker: {
            '0%, 94%, 100%': { opacity: '1' },
            '95%': { opacity: '0.3' },
            '96%': { opacity: '0.8' },
            '98%': { opacity: '0.5' },
        }
      }
    },
  },
  plugins: [],
};