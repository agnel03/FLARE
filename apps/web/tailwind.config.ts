import type { Config } from "tailwindcss";
import { darkColors, spacing, radius, typography } from "@flare/design-tokens";

const fontSize = Object.fromEntries(
  Object.entries(typography).map(([key, t]) => [
    key,
    [`${t.fontSize}px`, { lineHeight: `${t.lineHeight}px`, fontWeight: t.fontWeight }],
  ]),
) as Record<keyof typeof typography, [string, { lineHeight: string; fontWeight: string }]>;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--color-surface-muted) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        "brand-muted": "rgb(var(--color-brand-muted) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
        live: "rgb(var(--color-live) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)",
        "gold-muted": "rgb(var(--color-gold-muted) / <alpha-value>)",
      },
      spacing: Object.fromEntries(Object.entries(spacing).map(([k, v]) => [k, `${v}px`])),
      borderRadius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, `${v}px`])),
      fontSize,
    },
  },
  plugins: [],
};

export default config;

// Referenced so the dark palette stays imported/type-checked even though
// actual runtime values are injected as CSS variables in globals.css.
void darkColors;
