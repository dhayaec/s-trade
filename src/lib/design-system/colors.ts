/**
 * S-Trade Design System - Color Palette
 * Dark theme for professional trading terminal
 */

export const colors = {
  // Core backgrounds
  background: {
    primary: '#0B0F14', // Main background
    secondary: '#11161D', // Panel backgrounds
    tertiary: '#161D26', // Elevated panels
    hover: '#1A222E', // Hover states
    active: '#202731', // Active/pressed states
  },

  // Borders
  border: {
    primary: '#202731', // Default borders
    secondary: '#2A3340', // Subtle borders
    focus: '#3B82F6', // Focus ring
    error: '#EF4444', // Error borders
  },

  // Text
  text: {
    primary: '#E8EDF3', // Primary text
    secondary: '#8B96A5', // Secondary text
    muted: '#64748B', // Muted/disabled text
    inverse: '#0B0F14', // Text on colored backgrounds
  },

  // Semantic colors
  semantic: {
    positive: {
      primary: '#10B981', // Green - positive
      secondary: '#059669', // Darker green
      background: '#064E3B', // Green background
      border: '#10B981', // Green border
      text: '#D1FAE5', // Text on green
    },
    negative: {
      primary: '#EF4444', // Red - negative
      secondary: '#DC2626', // Darker red
      background: '#7F1D1D', // Red background
      border: '#EF4444', // Red border
      text: '#FEE2E2', // Text on red
    },
    warning: {
      primary: '#F59E0B', // Amber - warning
      secondary: '#D97706', // Darker amber
      background: '#78350F', // Amber background
      border: '#F59E0B', // Amber border
      text: '#FEF3C7', // Text on amber
    },
    info: {
      primary: '#3B82F6', // Blue - informational
      secondary: '#2563EB', // Darker blue
      background: '#1E3A5F', // Blue background
      border: '#3B82F6', // Blue border
      text: '#DBEAFE', // Text on blue
    },
  },

  // Setup-specific colors
  setup: {
    long: '#10B981', // Long setup
    short: '#EF4444', // Short setup
    neutral: '#8B96A5', // Neutral
  },

  // Grade colors
  grade: {
    EXCELLENT: '#10B981',
    STRONG: '#3B82F6',
    MODERATE: '#F59E0B',
    WEAK: '#EF4444',
    REJECT: '#64748B',
  },

  // Chart colors
  chart: {
    candle: {
      up: '#10B981',
      down: '#EF4444',
      borderUp: '#059669',
      borderDown: '#DC2626',
      wickUp: '#10B981',
      wickDown: '#EF4444',
    },
    volume: {
      up: 'rgba(16, 185, 129, 0.5)',
      down: 'rgba(239, 68, 68, 0.5)',
    },
    ema: {
      ema20: '#3B82F6',
      ema50: '#F59E0B',
      ema100: '#8B5CF6',
      ema200: '#EC4899',
    },
    zones: {
      support: 'rgba(16, 185, 129, 0.15)',
      supportBorder: '#10B981',
      resistance: 'rgba(239, 68, 68, 0.15)',
      resistanceBorder: '#EF4444',
    },
    trade: {
      entry: '#3B82F6',
      stopLoss: '#EF4444',
      target1: '#10B981',
      target2: '#059669',
    },
    grid: '#1A222E',
    crosshair: '#3B82F6',
  },

  // Overlay/scrim
  overlay: {
    light: 'rgba(11, 15, 20, 0.5)',
    medium: 'rgba(11, 15, 20, 0.7)',
    heavy: 'rgba(11, 15, 20, 0.9)',
  },
} as const;

export type Colors = typeof colors;
