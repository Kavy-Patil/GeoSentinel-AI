/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        geo: {
          bg: '#0B1118',
          navbar: '#151D26',
          panel: '#17212B',
          panelHover: '#1E2C3A',
          border: '#34404C',
          borderLight: '#465565',
          text: '#F3F6FA',
          secondary: '#AAB8C6',
          muted: '#6B7A8C',
          orange: '#FF8617',
          orangeGlow: 'rgba(255, 134, 23, 0.25)',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          cyan: '#06B6D4',
          blue: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
