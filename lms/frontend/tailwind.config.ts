import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
  fontFamily: {
    sans: ['SF Pro Display', 'Geist Sans', 'Helvetica Neue', 'sans-serif'],
    serif: ['Lyon Text', 'Newsreader', 'Playfair Display', 'serif'],
    mono: ['Geist Mono', 'SF Mono', 'JetBrains Mono', 'monospace'],
  },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          container: 'hsl(var(--primary-container))',
          'on-container': 'hsl(var(--on-primary-container))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          container: 'hsl(var(--secondary-container))',
          'on-container': 'hsl(var(--on-secondary-container))',
        },
        tertiary: {
          DEFAULT: 'hsl(var(--tertiary))',
          'on-container': 'hsl(var(--on-tertiary-container))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--on-success))',
          container: 'hsl(var(--success-container))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--on-warning))',
          container: 'hsl(var(--warning-container))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--on-error))',
          container: 'hsl(var(--error-container))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          variant: 'hsl(var(--surface-variant))',
          tint: {
            1: 'var(--surface-tint-1)',
            2: 'var(--surface-tint-2)',
            3: 'var(--surface-tint-3)',
            4: 'var(--surface-tint-4)',
            5: 'var(--surface-tint-5)',
          },
        },
        outline: {
          DEFAULT: 'hsl(var(--outline))',
          variant: 'hsl(var(--outline-variant))',
        },
      },
      borderRadius: {
        xs: 'var(--shape-xs)',
        sm: 'var(--shape-sm)',
        md: 'var(--shape-md)',
        lg: 'var(--shape-lg)',
        xl: 'var(--shape-xl)',
        full: 'var(--shape-full)',
      },
      boxShadow: {
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',
      },
      fontSize: {
        'display-lg': ['var(--display-lg)', { lineHeight: 'var(--display-lg-leading)', letterSpacing: 'var(--display-lg-tracking)', fontWeight: 'var(--display-lg-weight)' }],
        'display-md': ['var(--display-md)', { lineHeight: 'var(--display-md-leading)', letterSpacing: 'var(--display-md-tracking)', fontWeight: 'var(--display-md-weight)' }],
        'display-sm': ['var(--display-sm)', { lineHeight: 'var(--display-sm-leading)', letterSpacing: 'var(--display-sm-tracking)', fontWeight: 'var(--display-sm-weight)' }],
        'headline-lg': ['var(--headline-lg)', { lineHeight: 'var(--headline-lg-leading)', letterSpacing: 'var(--headline-lg-tracking)', fontWeight: 'var(--headline-lg-weight)' }],
        'headline-md': ['var(--headline-md)', { lineHeight: 'var(--headline-md-leading)', letterSpacing: 'var(--headline-md-tracking)', fontWeight: 'var(--headline-md-weight)' }],
        'headline-sm': ['var(--headline-sm)', { lineHeight: 'var(--headline-sm-leading)', letterSpacing: 'var(--headline-sm-tracking)', fontWeight: 'var(--headline-sm-weight)' }],
        'title-lg': ['var(--title-lg)', { lineHeight: 'var(--title-lg-leading)', letterSpacing: 'var(--title-lg-tracking)', fontWeight: 'var(--title-lg-weight)' }],
        'title-md': ['var(--title-md)', { lineHeight: 'var(--title-md-leading)', letterSpacing: 'var(--title-md-tracking)', fontWeight: 'var(--title-md-weight)' }],
        'title-sm': ['var(--title-sm)', { lineHeight: 'var(--title-sm-leading)', letterSpacing: 'var(--title-sm-tracking)', fontWeight: 'var(--title-sm-weight)' }],
        'body-lg': ['var(--body-lg)', { lineHeight: 'var(--body-lg-leading)', letterSpacing: 'var(--body-lg-tracking)', fontWeight: 'var(--body-lg-weight)' }],
        'body-md': ['var(--body-md)', { lineHeight: 'var(--body-md-leading)', letterSpacing: 'var(--body-md-tracking)', fontWeight: 'var(--body-md-weight)' }],
        'body-sm': ['var(--body-sm)', { lineHeight: 'var(--body-sm-leading)', letterSpacing: 'var(--body-sm-tracking)', fontWeight: 'var(--body-sm-weight)' }],
        'label-lg': ['var(--label-lg)', { lineHeight: 'var(--label-lg-leading)', letterSpacing: 'var(--label-lg-tracking)', fontWeight: 'var(--label-lg-weight)' }],
        'label-md': ['var(--label-md)', { lineHeight: 'var(--label-md-leading)', letterSpacing: 'var(--label-md-tracking)', fontWeight: 'var(--label-md-weight)' }],
        'label-sm': ['var(--label-sm)', { lineHeight: 'var(--label-sm-leading)', letterSpacing: 'var(--label-sm-tracking)', fontWeight: 'var(--label-sm-weight)' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'container-enter': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'container-exit': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(-16px)' },
        },
        'ripple': {
          to: { transform: 'scale(2)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
        'container-enter': 'container-enter 300ms cubic-bezier(0.05, 0, 0.133333, 0.06)',
        'container-exit': 'container-exit 150ms cubic-bezier(0.3, 0, 1, 1)',
        ripple: 'ripple 300ms cubic-bezier(0.2, 0, 0, 1) forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
