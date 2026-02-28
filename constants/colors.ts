const C = {
  bg: "#0A0E1A",
  bgSecondary: "#111827",
  card: "#1C2537",
  cardLight: "#243047",
  primary: "#E8192C",
  primaryDark: "#B91226",
  blue: "#3B82F6",
  gold: "#F59E0B",
  green: "#10B981",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textMuted: "#4B5563",
  border: "#2D3748",
  borderLight: "#374151",
  live: "#E8192C",
  win: "#10B981",
  loss: "#E8192C",
  tie: "#F59E0B",
};

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
