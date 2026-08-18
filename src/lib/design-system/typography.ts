/**
 * S-Trade Design System - Typography
 * Inter/Geist with tabular numbers for prices
 */

export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ],
    mono: [
      'JetBrains Mono',
      'ui-monospace',
      'SFMono-Regular',
      'Menlo',
      'Monaco',
      'Consolas',
      'Liberation Mono',
      'Courier New',
      'monospace',
    ],
    display: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }], // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }], // 14px
    base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }], // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }], // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }], // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }], // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }], // 36px
    '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.03em' }], // 48px
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Tabular numbers for price columns
  tabularNumbers: {
    fontFeatureSettings: '"tnum"',
    fontVariantNumeric: 'tabular-nums',
  },

  // Line height
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

export type Typography = typeof typography;
