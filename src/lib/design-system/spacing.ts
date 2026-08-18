/**
 * S-Trade Design System - Spacing, Sizing & Border Radius
 * Consistent scale for all UI elements
 */

export const spacing = {
  // Base unit: 4px
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px

  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
} as const;

export const sizing = {
  // Component heights
  height: {
    xs: '1.5rem', // 24px - small buttons, badges
    sm: '2rem', // 32px - inputs, small buttons
    md: '2.5rem', // 40px - standard buttons, inputs
    lg: '3rem', // 48px - large buttons
    xl: '3.5rem', // 56px - extra large
  },

  // Widths
  width: {
    xs: '12rem', // 192px
    sm: '16rem', // 256px
    md: '24rem', // 384px
    lg: '32rem', // 512px
    xl: '48rem', // 768px
    '2xl': '64rem', // 1024px
    full: '100%',
    screen: '100vw',
  },

  // Chart specific
  chart: {
    height: {
      sm: '200px',
      md: '350px',
      lg: '500px',
      xl: '650px',
    },
    sidebarWidth: '280px',
    setupCardWidth: '360px',
  },
} as const;

export const borderRadius = {
  // Scale: 6px controls, 8px cards, 12px panels
  none: '0',
  sm: '0.25rem', // 4px - small elements
  DEFAULT: '0.375rem', // 6px - controls, buttons, inputs
  md: '0.5rem', // 8px - cards, dropdowns
  lg: '0.75rem', // 12px - panels, modals
  xl: '1rem', // 16px - large panels
  '2xl': '1.5rem', // 24px
  full: '9999px', // Pills, avatars
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
  focus: '0 0 0 2px #3B82F6',
} as const;

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
} as const;

export type Spacing = typeof spacing;
export type Sizing = typeof sizing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type ZIndex = typeof zIndex;
