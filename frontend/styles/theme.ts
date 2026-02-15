// Theme color constants

export const colors = {
  // Dark theme colors
  background: '#000000',
  foreground: '#ffffff',
  
  // Raptoreum brand colors
  accent: '#b45a46',
  accentHover: '#c76b57',
  
  // Text colors
  muted: '#a0a0a0',
  
  // Borders and backgrounds
  border: '#2a2a2a',
  mutedBg: '#2a2a2a',
  cardBg: '#0d0d0d',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const

export type ThemeColor = keyof typeof colors
