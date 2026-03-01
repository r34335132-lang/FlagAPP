// Brand gradient: #1E5DBB → #E05AA6 → #FF6B1A
const C = {
  bg: "#0A0E1A",
  bgSecondary: "#10172A",
  card: "#141C2E",
  cardLight: "#1A2440",
  // Brand gradient stops
  brandBlue: "#1E5DBB",
  brandPink: "#E05AA6",
  brandOrange: "#FF6B1A",
  // Primary accent (orange — high energy)
  primary: "#FF6B1A",
  primaryDark: "#CC5514",
  // Blue accent
  blue: "#1E5DBB",
  // Pink accent
  pink: "#E05AA6",
  gold: "#F59E0B",
  green: "#10B981",
  text: "#FFFFFF",
  textSecondary: "#A0AEC0",
  textMuted: "#4A5568",
  border: "#1E2D4A",
  borderLight: "#253660",
  live: "#FF6B1A",
  win: "#10B981",
  loss: "#FF6B1A",
  tie: "#E05AA6",
};

export const BRAND_GRADIENT: [string, string, string] = ["#1E5DBB", "#E05AA6", "#FF6B1A"];
export const BRAND_GRADIENT_DARK: [string, string, string] = ["#1E5DBB99", "#E05AA666", "#FF6B1A88"];

export default {
  light: {
    tint: C.primary,
    tabIconDefault: C.textMuted,
    tabIconSelected: C.primary,
  },
  dark: {
    tint: C.primary,
    tabIconDefault: C.textMuted,
    tabIconSelected: C.primary,
  },
  ...C,
};
