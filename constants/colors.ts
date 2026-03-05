// Colores de Marca y Estados (No cambian con el modo oscuro)
const BRAND = {
  brandBlue: "#1E5DBB",
  brandPink: "#E05AA6",
  brandOrange: "#FF6B1A",
  primary: "#FF6B1A",
  primaryDark: "#CC5514",
  blue: "#1E5DBB",
  pink: "#E05AA6",
  gold: "#F59E0B",
  green: "#10B981",
  live: "#FF6B1A",
  win: "#10B981",
  loss: "#FF6B1A",
  tie: "#E05AA6",
};

export const BRAND_GRADIENT: [string, string, string] = ["#1E5DBB", "#E05AA6", "#FF6B1A"];
export const BRAND_GRADIENT_DARK: [string, string, string] = ["#1E5DBB99", "#E05AA666", "#FF6B1A88"];

export const Colors = {
  // ☀️ MODO CLARO
  light: {
    ...BRAND,
    bg: "#F8FAFC",              // Gris súper clarito para el fondo
    bgSecondary: "#F1F5F9",     // Gris secundario
    card: "#FFFFFF",            // Tarjetas blancas limpias
    cardLight: "#F8FAFC",
    text: "#0F172A",            // Texto casi negro
    textSecondary: "#64748B",   // Texto secundario grisáceo
    textMuted: "#94A3B8",       // Texto silenciado
    border: "#E2E8F0",          // Bordes sutiles
    borderLight: "#F1F5F9",
    tint: BRAND.primary,
    tabIconDefault: "#94A3B8",
    tabIconSelected: BRAND.primary,
  },
  // 🌙 MODO OSCURO (Tus colores originales)
  dark: {
    ...BRAND,
    bg: "#0A0E1A",              // Fondo azul marino casi negro
    bgSecondary: "#10172A",     // Fondo secundario
    card: "#141C2E",            // Tarjetas oscuras
    cardLight: "#1A2440",
    text: "#FFFFFF",            // Texto blanco
    textSecondary: "#A0AEC0",   // Texto secundario gris claro
    textMuted: "#4A5568",       // Texto silenciado oscuro
    border: "#1E2D4A",          // Bordes oscuros
    borderLight: "#253660",
    tint: BRAND.primary,
    tabIconDefault: "#4A5568",
    tabIconSelected: BRAND.primary,
  },
};

export default Colors;