import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector','[data-color-mode="dark"]'],
  theme: {
    extend: {
      colors: {
        'theme': 'rgb(var(--theme-rgb) / <alpha-value>)',
        'theme-hover': 'rgb(var(--theme-hover-rgb) / <alpha-value>)',
        'theme-active': 'rgb(var(--theme-active-rgb) / <alpha-value>)',
        'background': {
          'light': '#f5f5f5',
          'dark': '#1c1c1e',
        },
        'dark': "#333333"
      },
      transitionProperty: {
        'height': 'height',
        'width': 'width',
        'spacing': 'margin, padding',
      },
      typography: {
        apple: {
          css: {
            '--tw-prose-body': '#1d1d1f', // Apple 基础深灰
            '--tw-prose-headings': '#000000',
            'fontFamily': '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            a: {
              color: '#0066cc', // Apple 经典蓝
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'color 0.2s ease',
              '&:hover': { color: '#004499' },
            },
            table: {
              marginTop: '2em',
              marginBottom: '2em',
              borderRadius: '12px', // iOS 圆角风格
              overflow: 'hidden',
              borderCollapse: 'separate',
              borderSpacing: '0',
              border: '1px solid #e5e5ea',
              width: '100%',
            },
            thead: {
              backgroundColor: '#f5f5f7', // Mac 窗口顶栏背景色
              borderBottom: '1px solid #e5e5ea',
            },
            'thead th': {
              color: '#86868b', // Apple 次级文字灰
              fontWeight: '600',
              padding: '12px 16px',
              textAlign: 'left',
            },
            'tbody td': {
              padding: '12px 16px',
              borderBottom: '1px solid #e5e5ea',
            },
            'tbody tr:last-child td': {
              borderBottom: 'none',
            },
            blockquote: {
              borderLeftWidth: '4px',
              borderLeftColor: '#0066cc',
              backgroundColor: '#f5f5f7',
              padding: '12px 20px',
              borderRadius: '0 12px 12px 0',
              fontStyle: 'normal',
              color: '#1d1d1f',
            },
          },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
} satisfies Config
