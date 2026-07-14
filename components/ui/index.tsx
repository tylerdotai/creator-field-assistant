"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { forwardRef } from "react";

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const SPRING = { type: "spring" as const, duration: 0.16, bounce: 0.1 };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className = "", disabled, ...props }, ref) => {
    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      fontFamily: "var(--font-heading)",
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      border: "none",
      borderRadius: "6px",
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      transition: `transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background 200ms ease`,
      userSelect: "none",
      WebkitTapHighlightColor: "transparent",
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: { background: "var(--accent)", color: "#0a0a0a" },
      secondary: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" },
      ghost: { background: "transparent", color: "var(--text-secondary)" },
      danger: { background: "var(--danger)", color: "#fff" },
    };

    const sizes: Record<string, React.CSSProperties> = {
      sm: { fontSize: "11px", padding: "6px 12px", height: "32px" },
      md: { fontSize: "12px", padding: "8px 16px", height: "40px" },
      lg: { fontSize: "14px", padding: "12px 24px", height: "48px" },
    };

    const style = {
      ...base,
      ...variants[variant],
      ...sizes[size],
      transition: "all 150ms ease",
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : loading ? 0.7 : 1,
    };

    return (
      <button
        ref={ref}
        style={style}
        disabled={disabled || loading}
        onClick={(e) => {
          if (disabled || loading) return;
          if (props.onClick) props.onClick(e);
        }}
        onTouchStart={(e) => {
          if (disabled || loading) return;
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
        }}
        onTouchEnd={(e) => {
          if (disabled || loading) return;
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        {...props}
      >
        {loading ? "..." : children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", style, ...props }, ref) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label && (
        <label
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        style={{
          background: "var(--surface)",
          border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
          borderRadius: "6px",
          color: "var(--text)",
          fontSize: "14px",
          fontFamily: "var(--font-body)",
          padding: "10px 12px",
          height: "42px",
          outline: "none",
          width: "100%",
          transition: "border-color 200ms ease",
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: "11px", color: "var(--danger)" }}>{error}</span>
      )}
    </div>
  )
);
Input.displayName = "Input";

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = "", style, ...props }, ref) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label && (
        <label
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--text)",
          fontSize: "14px",
          fontFamily: "var(--font-body)",
          padding: "10px 12px",
          outline: "none",
          width: "100%",
          resize: "none",
          minHeight: "80px",
          transition: "border-color 200ms ease",
          ...style,
        }}
        {...props}
      />
    </div>
  )
);
Textarea.displayName = "Textarea";

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = "", style, ...props }, ref) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label && (
        <label
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--text)",
          fontSize: "14px",
          fontFamily: "var(--font-body)",
          padding: "10px 12px",
          height: "42px",
          outline: "none",
          width: "100%",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a0a0a0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          ...style,
        }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
);
Select.displayName = "Select";

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, style, onClick }: CardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "16px",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      animate={prefersReducedMotion ? {} : isPressed ? { scale: 0.98 } : { scale: 1 }}
      transition={SPRING}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "outline";
  style?: React.CSSProperties;
}

export function Badge({ children, variant = "default", style }: BadgeProps) {
  const variants: Record<string, React.CSSProperties> = {
    default: { background: "var(--border)", color: "var(--text-secondary)" },
    accent: { background: "rgba(0,210,255,0.15)", color: "var(--accent)" },
    success: { background: "rgba(16,185,129,0.15)", color: "var(--success)" },
    warning: { background: "rgba(245,158,11,0.15)", color: "var(--warning)" },
    danger: { background: "rgba(239,68,68,0.15)", color: "var(--danger)" },
    outline: { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-heading)",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 7px",
        borderRadius: "4px",
        whiteSpace: "nowrap",
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─── FAB ──────────────────────────────────────────────────────────────────────

interface FABProps {
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FAB({ onClick, children, style }: FABProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      animate={pressed ? { scale: 0.93 } : { scale: 1 }}
      transition={SPRING}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        background: "var(--accent)",
        color: "#0a0a0a",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 24px rgba(0,210,255,0.35)",
        zIndex: 50,
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: "1px",
        background: "var(--border)",
        width: "100%",
        ...style,
      }}
    />
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: "12px",
        textAlign: "center",
      }}
    >
      {icon && (
        <div style={{ color: "var(--text-secondary)", opacity: 0.5 }}>{icon}</div>
      )}
      <p
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          margin: 0,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            opacity: 0.6,
            margin: 0,
            maxWidth: "240px",
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── StaggerList ─────────────────────────────────────────────────────────────

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export function StaggerList({
  children,
  delay = 0.03,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: delay } },
      }}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={ITEM_VARIANTS} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}
