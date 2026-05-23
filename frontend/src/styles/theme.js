// ─────────────────────────────────────────────────────────────
// Aptico — JS-level Theme Tokens
// Mirrors the CSS custom properties in index.css for use in
// dynamic calculations, SVG rendering, and non-Tailwind contexts.
// ─────────────────────────────────────────────────────────────

export const colors = {
  brand: {
    DEFAULT: '#4edea3',
    dark: '#006c49',
    light: '#8df5ca',
  },
  surface: {
    50: '#f7f7f5',
    100: '#efefeb',
    200: '#e7e5e4',
    800: '#1c1b1d',
    900: '#131315',
    950: '#0a0a0c',
  },
  text: {
    primary: '#e5e1e4',
    muted: '#86948a',
    accent: '#4edea3',
    dark: {
      primary: '#18181b',
      muted: '#71717a',
    },
  },
  accent: {
    DEFAULT: '#4edea3',
    strong: '#4edea3',
    soft: 'rgba(78, 222, 163, 0.12)',
  },
  warning: {
    DEFAULT: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.24)',
    text: '#fbbf24',
  },
  danger: {
    DEFAULT: '#ef4444',
    soft: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(248, 113, 113, 0.24)',
  },
};

export const spacing = {
  page: {
    px: { sm: '1rem', md: '1.5rem', lg: '2rem' },
    py: { section: '3rem', sectionMd: '4rem', sectionLg: '6rem' },
  },
  card: { sm: '1rem', md: '1.5rem' },
  gap: { sm: '1rem', md: '1.5rem' },
};

export const typography = {
  fontFamily: '"Inter", sans-serif',
  monoFamily: '"JetBrains Mono", monospace',
  sizes: {
    pageTitle: { sm: '1.5rem', md: '1.875rem' },
    sectionHeading: '1.25rem',
    cardTitle: '1rem',
    body: '0.875rem',
    kicker: '0.65rem',
  },
};

export const layout = {
  maxWidth: '80rem',   // max-w-7xl equivalent (1280px)
  navbar: '4rem',      // 64px
  sidebar: '15rem',    // 240px
  sidebarCollapsed: '4rem', // 64px
};

export default { colors, spacing, typography, layout };
