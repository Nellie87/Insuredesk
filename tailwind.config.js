/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef4ff',
          100: '#dbe7ff',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#0f1f4b',
        },
        canvas: {
          DEFAULT: '#f3f6fb',
          soft: '#e8eef8',
        },
        success: {
          50:  '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
        },
        warning: {
          50:  '#fffbeb',
          500: '#f59e0b',
          700: '#b45309',
        },
        danger: {
          50:  '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 31, 75, 0.04), 0 8px 24px rgba(15, 31, 75, 0.06)',
        panel: '0 4px 40px rgba(15, 31, 75, 0.08)',
        soft: '0 1px 3px rgba(15, 31, 75, 0.05)',
      },
      backgroundImage: {
        'app-atmosphere':
          'radial-gradient(ellipse 80% 60% at 10% -10%, rgba(59, 130, 246, 0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 95% 5%, rgba(147, 197, 253, 0.22), transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(191, 219, 254, 0.18), transparent 55%)',
        'login-atmosphere':
          'radial-gradient(ellipse 90% 70% at 15% 10%, rgba(147, 197, 253, 0.45), transparent 55%), radial-gradient(ellipse 70% 60% at 90% 20%, rgba(191, 219, 254, 0.55), transparent 50%), radial-gradient(ellipse 80% 50% at 50% 100%, rgba(219, 234, 254, 0.7), transparent 55%)',
        'step-active':
          'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      },
    },
  },
  plugins: [],
}
