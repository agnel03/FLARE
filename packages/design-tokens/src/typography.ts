/**
 * Typography scale — token names mirror Frontend Design System spec
 * Section 3.2. `numericLarge/Medium/Small` are for scores/stats and use a
 * tabular-figure font so digits don't jitter width during live updates.
 */
export const typography = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: "800" },
  heading1: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  heading2: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  label: { fontSize: 13, lineHeight: 16, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  numericLarge: { fontSize: 48, lineHeight: 52, fontWeight: "800", fontVariantNumeric: "tabular-nums" },
  numericMedium: { fontSize: 24, lineHeight: 28, fontWeight: "700", fontVariantNumeric: "tabular-nums" },
  numericSmall: { fontSize: 16, lineHeight: 20, fontWeight: "600", fontVariantNumeric: "tabular-nums" },
} as const;

export type TypographyToken = keyof typeof typography;
