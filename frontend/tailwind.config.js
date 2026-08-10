/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        'primary-purple': '#B8E6C1',
        'deep-purple': '#52B788',
        'light-purple': '#F6F7F6',
        'primary-green': '#B8E6C1',
        'deep-green': '#52B788',
        'light-green': '#EEFBF2',
        'bg-page': '#FAFAFA',
        'bg-card': '#FFFFFF',
        'text-primary': '#1A1A2E',
        'text-secondary': '#35354E',
        'text-muted': '#5E5E7E',
        'border': '#E8E0F0',
        'border-light': '#F0ECF8',
        'success': '#52B788',
        'warning': '#F4A261',
        'danger': '#E76F51',
        'info': '#9B72CF',
      },
      fontSize: {
        h1: ['48px', { fontWeight: '700', lineHeight: '1.2' }],
        h2: ['32px', { fontWeight: '700', lineHeight: '1.2' }],
        h3: ['24px', { fontWeight: '600', lineHeight: '1.3' }],
        h4: ['18px', { fontWeight: '600', lineHeight: '1.4' }],
        'body-lg': ['16px', { fontWeight: '400', lineHeight: '1.7' }],
        body: ['14px', { fontWeight: '400', lineHeight: '1.6' }],
        sm: ['12px', { fontWeight: '400', lineHeight: '1.5' }],
        label: ['12px', { fontWeight: '500', lineHeight: '1.5', letterSpacing: '0.5px' }],
      },
      borderRadius: {
        DEFAULT: '16px',
        card: '16px',
        button: '12px',
        input: '10px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(155, 114, 207, 0.06)',
      },
    },
  },
  plugins: [],
}
