export const themeTokens = {
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  radius: {
    sm: "calc(var(--radius) - 6px)",
    md: "calc(var(--radius) - 4px)",
    lg: "var(--radius)",
    xl: "calc(var(--radius) + 0.25rem)",
    full: "9999px",
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
  brand: {
    primary: "Indigo-violet — brand actions, links, active states",
    success: "Teal — live/positive status only, not general brand use",
    warning: "Amber — caution states",
    destructive: "Muted red — destructive actions only",
    sidebar: "Deep navy — constant across light/dark modes",
  },
  typography: {
    sans: "Geist Sans — UI text, headings, body",
    mono: "Geist Mono — IDs, tokens, org slugs, metrics, timestamps",
  },
};