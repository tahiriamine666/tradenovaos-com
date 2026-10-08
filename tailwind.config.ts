import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ["Sora", "system-ui", "sans-serif"],
        body: ["Manrope", "system-ui", "sans-serif"],
      },
      colors: {
        // Legacy palette aliases resolve to semantic tokens, never independent hues.
        ...Object.fromEntries(
          ["blue", "cyan", "sky", "teal", "emerald", "green", "violet", "purple", "pink", "indigo"].map((name) => [name, {
            50: "hsl(var(--foreground))", 100: "hsl(var(--foreground))",
            200: "hsl(var(--primary))", 300: "hsl(var(--primary))",
            400: "hsl(var(--primary))", 500: "hsl(var(--primary))",
            600: "hsl(var(--primary))", 700: "hsl(var(--primary))",
            800: "hsl(var(--accent))", 900: "hsl(var(--accent))", 950: "hsl(var(--background))",
          }]),
        ),
        ...Object.fromEntries(
          ["red", "orange", "amber", "yellow", "rose", "lime", "fuchsia"].map((name) => [name, {
            50: "hsl(var(--foreground))", 100: "hsl(var(--foreground))",
            200: "hsl(var(--muted-foreground))", 300: "hsl(var(--muted-foreground))",
            400: "hsl(var(--muted-foreground))", 500: "hsl(var(--muted-foreground))",
            600: "hsl(var(--muted-foreground))", 700: "hsl(var(--muted-foreground))",
            800: "hsl(var(--muted))", 900: "hsl(var(--muted))", 950: "hsl(var(--background))",
          }]),
        ),
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--surface-foreground))",
          1: "hsl(var(--surface-1))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      typography: {
        DEFAULT: { css: {
          "--tw-prose-body": "hsl(var(--muted-foreground))",
          "--tw-prose-headings": "hsl(var(--foreground))",
          "--tw-prose-links": "hsl(var(--primary))",
          "--tw-prose-bold": "hsl(var(--foreground))",
          "--tw-prose-invert-body": "hsl(var(--muted-foreground))",
          "--tw-prose-invert-headings": "hsl(var(--foreground))",
          "--tw-prose-invert-links": "hsl(var(--primary))",
          "--tw-prose-invert-bold": "hsl(var(--foreground))",
        } },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
