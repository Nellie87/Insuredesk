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
          50:  '#eef6f4',
          100: '#d7ebe6',
          200: '#b4d7cf',
          300: '#86bdb3',
          400: '#579a90',
          500: '#3d8077',
          600: '#2f6b64',
          700: '#275650',
          800: '#234640',
          900: '#1c3834',
        },
        canvas: {
          DEFAULT: '#f4f2ed',
          soft: '#ebe7df',
        },
        ink: {
          DEFAULT: '#1e2a32',
          muted: '#5b6973',
          faint: '#8a959c',
        },
        success: {
          50:  '#eef8f1',
          500: '#3d9a66',
          700: '#2a6f4a',
        },
        warning: {
          50:  '#f8f1e6',
          500: '#c4893a',
          700: '#8a5c22',
        },
        danger: {
          50:  '#f8eeec',
          500: '#c45b4a',
          700: '#9a3f34',
        },
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(30, 42, 50, 0.04), 0 10px 28px rgba(30, 42, 50, 0.05)',
        panel: '0 8px 40px rgba(30, 42, 50, 0.08)',
        soft: '0 1px 3px rgba(30, 42, 50, 0.06)',
      },
      backgroundImage: {
        'app-atmosphere':
          'radial-gradient(ellipse 80% 60% at 8% -8%, rgba(47, 107, 100, 0.10), transparent 55%), radial-gradient(ellipse 70% 50% at 96% 4%, rgba(196, 137, 58, 0.10), transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(180, 215, 207, 0.22), transparent 55%)',
        'login-atmosphere':
          'radial-gradient(ellipse 90% 70% at 12% 8%, rgba(134, 189, 179, 0.42), transparent 55%), radial-gradient(ellipse 70% 60% at 92% 18%, rgba(248, 241, 230, 0.9), transparent 50%), radial-gradient(ellipse 80% 50% at 50% 100%, rgba(215, 235, 230, 0.7), transparent 55%)',
        'step-active':
          'linear-gradient(135deg, #3d8077 0%, #234640 100%)',
      },
    },
  },
  plugins: [],
}
