/**
 * Color tokens — token *names* mirror the Frontend Design System spec
 * (Section 3.1): background, surface, surfaceMuted, textPrimary,
 * textSecondary, textDisabled, border, brand, success, warning, danger,
 * info. The spec deliberately leaves exact values as an implementation
 * decision ("centralized in tokens rather than hard-coded in components").
 *
 * FLARE brand direction: dark-first "premium sports media + gaming"
 * aesthetic — near-black surfaces so live score/video pop, with a hot
 * flare-orange brand accent (nods to the name FLARE) plus a supporting
 * pitch-green used for positive/live states. Contrast ratios below target
 * WCAG AA against their paired surface (spec Section 28: Accessibility).
 */
export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  border: string;
  brand: string;
  brandMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  live: string;
}

export const darkColors: ColorTokens = {
  background: "#0B0E14",
  surface: "#151A24",
  surfaceMuted: "#1D2430",
  textPrimary: "#F5F7FA",
  textSecondary: "#9AA4B2",
  textDisabled: "#5B6472",
  border: "#2A3241",
  brand: "#FF5A1F",
  brandMuted: "#7A2E12",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  live: "#EF4444",
};

export const lightColors: ColorTokens = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF1F5",
  textPrimary: "#12151C",
  textSecondary: "#4B5563",
  textDisabled: "#9AA4B2",
  border: "#DFE3E9",
  brand: "#E64A16",
  brandMuted: "#FCD9C8",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",
  live: "#DC2626",
};
