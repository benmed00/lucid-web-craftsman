/**
 * Tailwind CSS configuration
 *
 * Uses semantic color tokens (hsl vars) for theming.
 * darkMode: 'class' — toggled via class on html element.
 *
 * @see https://tailwindcss.com/docs/configuration
 */

import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      scale: { '102': '1.02' },
      zIndex: {
        header: '40',
        dropdown: '45',
        floating: '40',
        overlay: '50',
        modal: '50',
        'mobile-overlay': '55',
        'mobile-menu': '56',
        'mobile-toggle': '60',
        toast: '100',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
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
        // Rating stars
        rating: {
          star: 'hsl(var(--rating-star))',
          empty: 'hsl(var(--rating-star-empty))',
        },
        // Status colors
        status: {
          success: 'hsl(var(--status-success))',
          'success-foreground': 'hsl(var(--status-success-foreground))',
          warning: 'hsl(var(--status-warning))',
          'warning-foreground': 'hsl(var(--status-warning-foreground))',
          error: 'hsl(var(--status-error))',
          'error-foreground': 'hsl(var(--status-error-foreground))',
          info: 'hsl(var(--status-info))',
          'info-foreground': 'hsl(var(--status-info-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Custom colors using semantic tokens from CSS variables
        olive: {
          50: 'hsl(var(--olive-50))',
          100: 'hsl(var(--olive-100))',
          200: 'hsl(var(--olive-200))',
          300: 'hsl(var(--olive-300))',
          500: 'hsl(var(--olive-500))',
          700: 'hsl(var(--olive-700))',
          800: 'hsl(var(--olive-800))',
          900: 'hsl(var(--olive-900))',
        },
        beige: {
          50: 'hsl(var(--beige-50))',
        },
        stone: {
          50: 'hsl(var(--stone-50))',
          100: 'hsl(var(--stone-100))',
          200: 'hsl(var(--stone-200))',
          300: 'hsl(var(--stone-300))',
          400: 'hsl(var(--stone-400))',
          500: 'hsl(var(--stone-500))',
          600: 'hsl(var(--stone-600))',
          700: 'hsl(var(--stone-700))',
          800: 'hsl(var(--stone-800))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
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
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-gentle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.4s ease-out forwards',
        'pulse-gentle': 'pulse-gentle 2s ease-in-out infinite',
      },
      boxShadow: {
        elegant: 'var(--shadow-elegant)',
        glow: 'var(--shadow-glow)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-card': 'var(--gradient-card)',
      },
      aspectRatio: {
        '4/5': '4 / 5',
        '3/4': '3 / 4',
        '1/1': '1 / 1',
      },
    },
  },
  plugins: [import('tailwindcss-animate'), import('@tailwindcss/typography')], // Changed to import
} satisfies Config;
