/**
 * Color tokens — token *names* mirror the Frontend Design System spec
 * (Section 3.1): background, surface, surfaceMuted, textPrimary,
 * textSecondary, textDisabled, border, brand, success, warning, danger,
 * info. `gold` is an addition for the v2 visual direction below. The
 * spec deliberately leaves exact values as an implementation decision
 * ("centralized in tokens rather than hard-coded in components").
 *
 * FLARE brand direction (v2): an ORIGINAL elite-football-club visual
 * identity — deep red, near-black, white, restrained metallic gold —
 * inspired by the visual language of top-tier clubs in general, but not
 * copied from any specific club's crest, exact hex values, or proprietary
 * assets. Red is the action/energy accent; near-black is the dominant
 * premium surface; white carries high-contrast information; gold is
 * reserved ONLY for achievements, premium moments, trophies and
 * important highlights — never used as a general UI color. Contrast
 * ratios below target WCAG AA against their paired surface (spec
 * Section 28: Accessibility).
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
  /** Reserved for achievements/premium/trophies/highlights only. */
  gold: string;
  goldMuted: string;
}

export const darkColors: ColorTokens = {
  background: "#0A0A0C",
  surface: "#161618",
  surfaceMuted: "#1F2023",
  textPrimary: "#FAFAFA",
  textSecondary: "#9CA0A8",
  textDisabled: "#5C6068",
  border: "#2B2C30",
  brand: "#E01A2B",
  brandMuted: "#4A0E12",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  live: "#E01A2B",
  gold: "#C9A227",
  goldMuted: "#3A2F0E",
};

export const lightColors: ColorTokens = {
  background: "#F7F7F8",
  surface: "#FFFFFF",
  surfaceMuted: "#EFEFF1",
  textPrimary: "#131315",
  textSecondary: "#53565C",
  textDisabled: "#9CA0A8",
  border: "#E1E2E5",
  brand: "#C81424",
  brandMuted: "#F7D2D6",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#2563EB",
  live: "#C81424",
  gold: "#9C7A1A",
  goldMuted: "#F3E7C4",
};
