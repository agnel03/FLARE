"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-md ${className}`}>{children}</div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:opacity-90 disabled:opacity-40",
  secondary: "bg-surface-muted text-text-primary hover:opacity-90 disabled:opacity-40",
  danger: "bg-danger text-white hover:opacity-90 disabled:opacity-40",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`min-h-[44px] rounded-md px-md py-xs text-bodySmall font-semibold transition ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="min-h-[44px] w-full rounded-md border border-border bg-background px-sm py-xs text-body text-text-primary placeholder:text-text-secondary focus:border-brand focus:outline-none"
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-xxs block text-label text-text-secondary">{children}</label>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="mt-xxs text-bodySmall text-danger">{children}</p>;
}

export function Badge({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "warning" | "danger" | "live" }) {
  const toneClass: Record<string, string> = {
    info: "bg-info/20 text-info",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    danger: "bg-danger/20 text-danger",
    live: "bg-live/20 text-live",
  };
  return (
    <span className={`rounded-pill px-sm py-[2px] text-caption font-bold uppercase tracking-wide ${toneClass[tone]}`}>
      {children}
    </span>
  );
}
