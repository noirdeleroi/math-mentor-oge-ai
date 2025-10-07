import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // your existing design tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0A2540",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#33C3F0",
          foreground: "#ffffff",
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
          DEFAULT: "#2EC5CE",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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

        // === added to mirror the static page tokens ===
        navy: "#1a1f36",
        sage: "#10b981",
        gold: "#f59e0b",
        "cool-gray": "#64748b",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        typing: { "0%": { width: "0" }, "100%": { width: "100%" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0" } },
        "bounce-in": { "0%": { transform: "scale(0.8)", opacity: "0" }, "80%": { transform: "scale(1.05)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "pulse-wave-1": { "0%, 40%, 100%": { transform: "translateY(0)" }, "20%": { transform: "translateY(-6px)" } },
        "pulse-wave-2": { "0%, 60%, 100%": { transform: "translateY(0)" }, "40%": { transform: "translateY(-6px)" } },
        "pulse-wave-3": { "0%, 80%, 100%": { transform: "translateY(0)" }, "60%": { transform: "translateY(-6px)" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "slide-in-right": { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(0)" } },
        "scale-in": { "0%": { transform: "scale(0.95)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "math-fade-in": { from: { opacity: "0", transform: "translateY(5px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        typing: "typing 3.5s steps(40, end)",
        blink: "blink 1s step-end infinite",
        "bounce-in": "bounce-in 0.5s ease-out",
        "pulse-wave-1": "pulse-wave-1 1.2s ease-in-out infinite",
        "pulse-wave-2": "pulse-wave-2 1.2s ease-in-out infinite 0.2s",
        "pulse-wave-3": "pulse-wave-3 1.2s ease-in-out infinite 0.4s",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "math-fade-in": "math-fade-in 0.3s ease-out forwards",
      },

      // fonts (keep your existing + add the three used in the static page)
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        heading: ['"Montserrat"', "sans-serif"],

        // new:
        display: ['"Playfair Display"', "serif"],
        body: ['"Inter"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },

      // (optional) tiny helpers to recreate gradient text
      backgroundImage: {
        "gold-sage": "linear-gradient(135deg, #f59e0b, #10b981)",
        "navy-diag": "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
