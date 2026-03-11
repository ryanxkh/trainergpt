# Geist Design System — Comprehensive Reference

Compiled from: vercel.com/geist/colors, vercel.com/geist/typography, vercel.com/geist/materials, vercel.com/geist/icons, vercel.com/geist/introduction

---

## Table of Contents

1. [Overview & Principles](#overview--principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Materials & Surfaces](#materials--surfaces)
5. [Icons](#icons)
6. [Spacing & Layout](#spacing--layout)
7. [Grid System](#grid-system)
8. [Border Radius](#border-radius)
9. [Shadows & Elevation](#shadows--elevation)
10. [Component Library Overview](#component-library-overview)
11. [Implementation Patterns](#implementation-patterns)

---

## Overview & Principles

Geist is Vercel's design system for building consistent and delightful web experiences. It is the design language used across vercel.com, the Vercel dashboard, Next.js, Turbo, and v0.

**Core principles:**
- Minimalism, precision, and simplicity
- High contrast and accessibility
- Developer-first ergonomics
- Consistent token-based styling
- Light and dark mode support via CSS custom properties

**Technology layer:**
- Tokens consumed as Tailwind CSS classes
- CSS custom properties (`--ds-*` prefix) for all semantic values
- React component library (`geist/components`)
- Full P3 wide-gamut color support on compatible displays
- Theme stored in localStorage key `"zeit-theme"` (values: `"light"`, `"dark"`, `"system"`)

---

## Color System

### Architecture

10 color scales, each with 10 steps. Steps 1–3 are backgrounds, 4–6 are borders, 7–8 are high-contrast backgrounds, 9–10 are text and icons.

**CSS variable naming convention:** `--ds-{scale}-{step}` where step is `100`–`1000` (maps to scale positions 1–10).

### Color Role Map

| Step | CSS Suffix | Role |
|------|-----------|------|
| 1 | `100` | Default component background |
| 2 | `200` | Hover state background |
| 3 | `300` | Active/pressed state background |
| 4 | `400` | Default border |
| 5 | `500` | Hover border |
| 6 | `600` | Active/focus border |
| 7 | `700` | High contrast background |
| 8 | `800` | Hover high contrast background |
| 9 | `900` | Secondary text / secondary icons |
| 10 | `1000` | Primary text / primary icons |

### Background Scale

Two dedicated page/surface background tokens:

| Token | CSS Variable | Description |
|-------|-------------|-------------|
| Background 1 | `--ds-background-100` | Default page/element background |
| Background 2 | `--ds-background-200` | Secondary background, subtle differentiation |

### Gray Scale

Full 10-step neutral scale. Primary scale for UI chrome, text, borders.

| Token | CSS Variable |
|-------|-------------|
| Gray 1 | `--ds-gray-100` |
| Gray 2 | `--ds-gray-200` |
| Gray 3 | `--ds-gray-300` |
| Gray 4 | `--ds-gray-400` |
| Gray 5 | `--ds-gray-500` |
| Gray 6 | `--ds-gray-600` |
| Gray 7 | `--ds-gray-700` |
| Gray 8 | `--ds-gray-800` |
| Gray 9 | `--ds-gray-900` |
| Gray 10 | `--ds-gray-1000` |

**Light mode approximate values (from Vercel dashboard source):**

| Token | Light | Dark |
|-------|-------|------|
| `--ds-gray-100` | `#fafafa` | `#111` |
| `--ds-gray-200` | `#eaeaea` | `#1a1a1a` |
| `--ds-gray-300` | `#e5e5e5` | `#222` |
| `--ds-gray-400` | `#d4d4d4` | `#2a2a2a` |
| `--ds-gray-500` | `#a3a3a3` | `#444` |
| `--ds-gray-600` | `#737373` | `#666` |
| `--ds-gray-700` | `#525252` | `#888` |
| `--ds-gray-800` | `#404040` | `#999` |
| `--ds-gray-900` | `#262626` | `#ccc` |
| `--ds-gray-1000` | `#0a0a0a` | `#ededed` |

### Gray Alpha Scale

Transparent gray variants for overlays and glass effects:

| Token | CSS Variable |
|-------|-------------|
| Gray Alpha 1 | `--ds-gray-alpha-100` |
| Gray Alpha 2 | `--ds-gray-alpha-200` |
| Gray Alpha 3 | `--ds-gray-alpha-300` |
| Gray Alpha 4 | `--ds-gray-alpha-400` |

### Blue Scale

| Token | CSS Variable |
|-------|-------------|
| Blue 1–8 | `--ds-blue-100` through `--ds-blue-800` |
| Blue 9 | `--ds-blue-900` |
| Blue 10 | `--ds-blue-1000` |

**Commonly referenced blue tokens:**
- `--ds-blue-700` — Interactive blue (links, focus rings)
- `--ds-blue-900` — Primary blue text / high-contrast blue

**Approximate values:**
- `--ds-blue-900` (light): `#0070f3`
- `--ds-blue-700` (light): `#3291ff`

### Red Scale

| Token | CSS Variable |
|-------|-------------|
| Red 1–8 | `--ds-red-100` through `--ds-red-800` |
| Red 9 | `--ds-red-900` |
| Red 10 | `--ds-red-1000` |

**Commonly referenced:**
- `--ds-red-800` — Error states, destructive actions

**Approximate values:**
- `--ds-red-800` (light): `#e00`
- Lighter red: `#ff1a1a`
- Darker red: `#c50000`
- Lightest red (background): `#f7d4d6`

### Amber Scale

| Token | CSS Variable |
|-------|-------------|
| Amber 1 | `--ds-amber-100` |
| Amber 4 | `--ds-amber-400` |
| Amber 7 | `--ds-amber-700` |
| Amber 9 | `--ds-amber-900` |
| Full scale | `--ds-amber-100` through `--ds-amber-1000` |

**Approximate values:**
- `--ds-amber-100` (light): `#ffefcf` — Warning background
- `--ds-amber-400` (light): `#f7b955` — Warning border
- `--ds-amber-700` (light): `#f5a623` — Warning default
- `--ds-amber-900` (light): `#ab570a` — Warning text/icon

### Green Scale

| Token | CSS Variable |
|-------|-------------|
| Green 1–8 | `--ds-green-100` through `--ds-green-800` |
| Green 9 | `--ds-green-900` |
| Green 10 | `--ds-green-1000` |

**Commonly referenced:**
- `--ds-green-700` — Success states

**Approximate values:**
- `--ds-green-700` (light): `#50e3c2` → actual success green: `#0070f3` family

### Teal Scale

| Token | CSS Variable |
|-------|-------------|
| Teal 1–10 | `--ds-teal-100` through `--ds-teal-1000` |

### Purple Scale

| Token | CSS Variable |
|-------|-------------|
| Purple 1–10 | `--ds-purple-100` through `--ds-purple-1000` |

**Approximate values:**
- `--ds-purple-700` (light): `#7928ca`
- Lighter purple: `#8a63d2`

### Pink Scale

| Token | CSS Variable |
|-------|-------------|
| Pink 1–10 | `--ds-pink-100` through `--ds-pink-1000` |

**Highlight colors (legacy / brand):**
- Pink highlight: `#ff0080`
- Magenta highlight: `#eb367f`
- Purple highlight: `#f81ce5`

### Legacy / Vercel Brand Colors

These tokens predate the `--ds-*` system but are still present in some codebases:

| Token | Value | Notes |
|-------|-------|-------|
| `--geist-white` | `#ffffff` | |
| `--geist-black` | `#000000` | |
| `--geist-background` | `var(--geist-white)` | |
| `--geist-foreground` | `var(--geist-black)` | |
| `--accents-1` | `#fafafa` | Lightest gray |
| `--accents-2` | `#eaeaea` | |
| `--accents-3` | `#999999` | |
| `--accents-4` | `#888888` | |
| `--accents-5` | `#666666` | |
| `--accents-6` | `#444444` | |
| `--accents-7` | `#333333` | |
| `--accents-8` | `#111111` | Darkest gray |
| `--shadow` | `rgba(0,0,0,0.12)` | Default shadow |

### Color Usage Guidelines

- **Backgrounds (1–3):** Use only for component background fills — never for text
- **Borders (4–6):** Always pair border color with corresponding hover/focus state steps
- **High Contrast (7–8):** For filled components (badges, pills, solid buttons)
- **Text/Icons (9–10):** Step 9 = secondary, Step 10 = primary
- **Gray Alpha variants:** Preferred for overlays on colored or image backgrounds
- **P3 colors:** Automatically applied on supporting displays (Chrome, Safari); CSS fallback is always included

---

## Typography

### Type Families

| Family | CSS Variable | Tailwind Class | Use |
|--------|-------------|----------------|-----|
| Geist Sans | `--font-geist-sans` | `font-sans` | UI, headings, body text |
| Geist Mono | `--font-geist-mono` | `font-mono` | Code, terminals, numbers |

Both fonts are available as variable fonts (weight 100–900, single file ~30 KB each) or as static WOFF2 files per weight.

**npm package:** `npm install geist`

**Import example:**
```js
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
```

### Weight Scale

| Weight | Name |
|--------|------|
| 100 | Thin |
| 200 | ExtraLight |
| 300 | Light |
| 400 | Regular |
| 500 | Medium |
| 600 | SemiBold |
| 700 | Bold |
| 800 | ExtraBold |
| 900 | Black |

### Type Scale System

Typography is consumed as **Tailwind CSS utility classes** that bundle `font-size`, `line-height`, `letter-spacing`, and `font-weight` together. The numeric suffix in each class name corresponds to the font-size in pixels.

**Modifiers:** Wrap content in `<strong>` to activate Strong or Subtle variants without additional class names.

---

#### Headings

Used for page and section introductions. Heading classes apply tight letter-spacing and appropriate font-weight for display use.

| Class | Size | Primary Use |
|-------|------|-------------|
| `text-heading-72` | 72px | Marketing heroes, splash screens |
| `text-heading-64` | 64px | Large marketing headers |
| `text-heading-56` | 56px | Section heroes |
| `text-heading-48` | 48px | Feature section headers |
| `text-heading-40` | 40px | Sub-feature headers |
| `text-heading-32` | 32px | Marketing subheadings, dashboard primary headings |
| `text-heading-32` + Subtle | 32px | Paragraph-level subheadings |
| `text-heading-24` | 24px | Panel/card headings |
| `text-heading-20` | 20px | Modal titles, widget headers |
| `text-heading-16` | 16px | Section labels, sidebar headings |
| `text-heading-16` + Subtle | 16px | Quieter section headings |
| `text-heading-14` | 14px | Compact headings, list group headers |

---

#### Buttons

Specialized type settings optimized for interactive button elements.

| Class | Size | Primary Use |
|-------|------|-------------|
| `text-button-16` | 16px | Large/primary buttons |
| `text-button-14` | 14px | Default/standard buttons |
| `text-button-12` | 12px | Tiny buttons, buttons inside input fields |

---

#### Labels

Single-line text with ample line-height to comfortably accommodate inline icons.

| Class | Size | Variants | Primary Use |
|-------|------|----------|-------------|
| `text-label-20` | 20px | — | Marketing callouts |
| `text-label-18` | 18px | — | Marketing text |
| `text-label-16` | 16px | Strong | Titles, prominent item names |
| `text-label-14` | 14px | Strong | Most common label; default for dashboard UI |
| `text-label-14-mono` | 14px | — | Monospace label, pairs with `text-label-14` |
| `text-label-13` | 13px | Strong, Tabular | Secondary lines; tabular for numeric data |
| `text-label-13-mono` | 13px | — | Code snippets paired alongside Label 14 |
| `text-label-12` | 12px | Strong, CAPS | Tertiary text in dense views (calendars, comments) |
| `text-label-12-mono` | 12px | — | Small monospace, code annotations |

---

#### Copy

Multi-line body text with larger line-height than labels for comfortable reading.

| Class | Size | Variants | Primary Use |
|-------|------|----------|-------------|
| `text-copy-24` | 24px | — | Hero body text, large quotes |
| `text-copy-20` | 20px | Strong | Feature descriptions |
| `text-copy-18` | 18px | Strong | Marketing paragraphs, blockquotes |
| `text-copy-16` | 16px | Strong | Modal body text, content with breathing room |
| `text-copy-14` | 14px | Strong | Most common body copy; default for dashboard text |
| `text-copy-13` | 13px | — | Secondary copy, space-constrained views |
| `text-copy-13-mono` | 13px | — | Inline code mentions |

---

### Typography Guidelines

- **Headings vs. Copy:** Use heading classes for single-line hierarchy; use copy classes for paragraphs
- **Labels vs. Copy:** Labels are for UI chrome (nav items, table cells, form labels); Copy is for readable body text
- **Mono variants:** Use `*-mono` classes when pairing monospace text inline with proportional text of the same size
- **Strong modifier:** Applied via `<strong>` element — increases font-weight for emphasis
- **Subtle modifier:** Applied via `<strong>` — decreases visual weight for secondary headings
- **Tabular variant:** Use `text-label-13` tabular for numeric columns that need digit alignment

### Font Metrics (Shared: Geist Sans & Geist Mono)

| Metric | Value |
|--------|-------|
| hheaAscender | 1005 |
| hheaDescender | -295 |
| hheaLineGap | 0 |
| typoAscender | 1005 |
| typoDescender | -295 |
| typoLineGap | 0 |
| winAscent | 1012 |
| winDescent | 262 |

### OpenType Features

**Geist Sans:**
- Ligatures (`liga`)
- Stylistic sets (`ss01`–`ss10`)
- Superscripts (`sups`), subscripts (`subs`/`sinf`)
- Numerators (`numr`), denominators (`dnom`)
- Fractions (`frac`)
- Localized forms (`locl`)
- Case-sensitive forms (`case`)

**Geist Mono (additional programming ligatures):**
- Arrows: `->` → `→`, `=>` → `⟹`, `<-` → `←`
- Comparisons: `===`, `!==`, `<=`, `>=`
- Operators: `...`, `::`, `//`

---

## Materials & Surfaces

The Material system defines visual elevation through shadows, background treatments, and border-radius. All material types are available as the `<Material type="...">` React component from `geist/components`, and as Tailwind utility classes (`material-*`).

### On-Page Surfaces

These materials sit within the page flow.

| Type | Class | Border Radius | Description |
|------|-------|--------------|-------------|
| Base | `material-base` | 6px | Everyday use — cards, panels, default surfaces |
| Small | `material-small` | 6px | Slightly raised; for subtle elevation above Base |
| Medium | `material-medium` | 12px | Further raised; section containers |
| Large | `material-large` | 12px | Maximum on-page elevation; featured content blocks |

### Floating Surfaces

These materials float above the page, used for overlays and transient UI.

| Type | Class | Border Radius | Description |
|------|-------|--------------|-------------|
| Tooltip | `material-tooltip` | 6px | Lightest shadow; only floating element that may have a triangular stem |
| Menu | `material-menu` | 12px | Context menus, dropdowns; lifted from page |
| Modal | `material-modal` | 12px | Dialog overlays; further lift than menus |
| Fullscreen | `material-fullscreen` | 16px | Maximum elevation; full-screen takeovers, sheets |

### Elevation Hierarchy

Shadow intensity and blur increase progressively:

```
Base (lowest) → Small → Medium → Large → Tooltip → Menu → Modal → Fullscreen (highest)
```

### Usage Guidelines

- **Base** — Default container; use for cards, settings panels, code blocks
- **Small** — Hover states on interactive surfaces, secondary panels
- **Medium** — Primary content sections, feature cards
- **Large** — Hero sections, prominent feature showcases
- **Tooltip** — Short-lived labels on hover; limited to one line with optional stem pointer
- **Menu** — Contextual actions, dropdowns, comboboxes
- **Modal** — Blocking dialogs requiring user decision
- **Fullscreen** — Command palettes, full-panel drawers, immersive overlays

### React Usage

```tsx
import { Material } from 'geist/components';

// All type variants:
<Material type="base">...</Material>
<Material type="small">...</Material>
<Material type="medium">...</Material>
<Material type="large">...</Material>
<Material type="tooltip">...</Material>
<Material type="menu">...</Material>
<Material type="modal">...</Material>
<Material type="fullscreen">...</Material>
```

---

## Icons

### Collection Overview

700+ icons covering all Vercel product surface areas. Available via right-click to copy on vercel.com/geist/icons.

**npm:** Icons ship with the `geist` package.

**Figma:** [Geist Icons (Vercel) — Figma Community](https://www.figma.com/community/file/1434291339972112007/geist-icons-vercel)

### Technical Specifications

- **Grid:** All icons live in **16px frames**
- **Default display size:** 16px
- **Style:** Line/outline icons optimized for developer tool interfaces
- **Theme:** Icons adapt to light and dark modes via the color system

### Icon Categories

| Category | Examples |
|----------|---------|
| Navigation & Direction | arrow-up, arrow-down, arrow-left, arrow-right, chevron-up, chevron-down, chevron-left, chevron-right, arrow-diagonal |
| UI Controls | button, toggle, checkbox, radio, switch, slider |
| Communication | message, bell, envelope, notification |
| Files & Media | file, file-zip, file-text, image, video, camera, dependency |
| Data & Analytics | chart-bar, chart-pie, chart-line, graph, gauge, analytics, delta |
| Development | code, terminal, function, database, server, api, webhook, variable |
| Version Control | git-branch, git-commit, git-merge, git-pull-request |
| Brand & Logos | vercel, next-js, react, vue, turbo, github, slack, discord |
| Status | check, warning, error, info, x-circle, check-circle |
| Navigation Chrome | home, sidebar, menu, layers, layout, tab, toolbar |
| Security | shield, lock, lock-open, verified-check, authentication |
| User | user, users, user-plus, user-minus, avatar |
| Time | clock, calendar, history, refresh |
| Settings | settings, wrench, option, filter, sort |
| Storage | database, postgres, cloud, archive, store |
| Network | globe, network, router, edge, cdn |
| Devices | phone, tablet, browser, window, monitor |
| Actions | download, upload, share, copy, trash, pencil, plus, minus, search, link, pin |
| AI / Agents | agent, vercel-agent, function (various), hook, workflow |

### Partial Icon Name List (Alphabetical)

accessibility, agent, alignment, analytics, archive, arrow (12+ variants), authentication, badge, beaker, bell, browser (multiple), calculator, calendar, chart (6+ variants), check, chevron (8 variants), clock, cloud, code-block, copy, database, delta, device, dollar-sign, download, edge, envelope, error, eye, file (10+ variants), filter, function (5+ variants), gauge, git-branch, git-commit, git-merge, git-pull-request, globe, header, home, hook, image, info, inspect, keyboard, layers, layout-shift, lightning, link, lock, logo (25+ brands), magnifying-glass, material, menu, message, modal, moon, music, network, next-js, notebook, notification, option, pause, pencil, phone, pin, play, plus, postgres, preview, question, radio, react, refresh, router, rss, sandbox, scroll, settings, share, shield, sign-in, skip, sort, speaker, star, status, stop, store, sun, switch, tab, tag, target, terminal, text (formatting variants), thumb-up, thumb-down, toggle, toolbar, traces, trash, turbo, upload, user (5 variants), variable, vercel, vercel-agent, verified-check, video, vue, warning, webhook, window (3 variants), workflow, wrench, x, zero-config

### Usage Guidelines

- Icons render at **16px** by default (matching their design frame)
- Scale up by doubling: 16px → 32px for marketing contexts
- Never use icons smaller than 12px (legibility threshold)
- Match icon color to the corresponding text step (`--ds-gray-900` for secondary, `--ds-gray-1000` for primary)
- Right-click any icon on the Geist icons page to copy SVG or component code

---

## Spacing & Layout

### Base Unit

The Geist spacing system uses **4px** as the foundational unit. All spacing values are multiples of 4px.

### Spacing Scale

| Multiplier | Value | Tailwind Equivalent |
|-----------|-------|-------------------|
| 1× | 4px | `p-1`, `gap-1` |
| 2× | 8px | `p-2`, `gap-2` |
| 3× | 12px | `p-3`, `gap-3` |
| 4× | 16px | `p-4`, `gap-4` |
| 5× | 20px | `p-5`, `gap-5` |
| 6× | 24px | `p-6`, `gap-6` |
| 8× | 32px | `p-8`, `gap-8` |
| 10× | 40px | `p-10`, `gap-10` |
| 12× | 48px | `p-12`, `gap-12` |
| 16× | 64px | `p-16`, `gap-16` |

### Semantic Spacing Tokens (Legacy)

| Token | Value | Use |
|-------|-------|-----|
| `--geist-space` | 4px | Base unit |
| `--geist-space-small` | 32px | Compact components |
| `--geist-space-medium` | 40px | Default components |
| `--geist-space-large` | 48px | Spacious/marketing components |
| `--geist-space-gap` | 24px | Standard content gap |

### Common Gap Values

Observed across Geist components: `6px`, `8px`, `10px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`

### Header Height

| Token | Value |
|-------|-------|
| `--header-height` / `--geist-page-nav-height` | 64px |

### Max Page Width

| Token | Value |
|-------|-------|
| `--geist-page-width` | 1000px |

---

## Grid System

Geist includes a responsive multi-column grid system — described as "a huge part of the new Vercel aesthetic."

### Grid Structure

- **Base column count:** 9 columns (as demonstrated in the introduction page)
- **Responsive behavior:** Column count and gap adjust at breakpoints
- **CSS variables:**
  - `--sm-grid-columns`
  - `--md-grid-columns`
  - `--lg-grid-columns`
- **Breakpoints:** `xs`, `sm`, `smd`, `md`, `lg` (Tailwind prefix classes)
- **Cell spanning:** Flexible; cells can span multiple columns and rows
- **Usage:** Primarily for marketing/editorial layouts on vercel.com

### Breakpoints (Standard Tailwind + Geist Extensions)

| Prefix | Approximate Breakpoint |
|--------|----------------------|
| `xs` | < 640px |
| `sm` | ≥ 640px |
| `smd` | ≥ 768px (Geist custom) |
| `md` | ≥ 768px |
| `lg` | ≥ 1024px |
| `xl` | ≥ 1280px |

---

## Border Radius

| Material / Context | Value |
|-------------------|-------|
| `material-base` | 6px |
| `material-small` | 6px |
| `material-tooltip` | 6px |
| `material-medium` | 12px |
| `material-large` | 12px |
| `material-menu` | 12px |
| `material-modal` | 12px |
| `material-fullscreen` | 16px |
| Legacy `--geist-radius` | 5px |
| Large/feature cards (marketing) | Up to 24px |
| Rounded pill | `rounded-full` |

---

## Shadows & Elevation

The shadow system follows the material elevation hierarchy. Shadows increase in blur radius, spread, and opacity as elevation increases.

### Shadow Tokens

| Material | Approximate Shadow |
|----------|--------------------|
| `material-tooltip` | Lightest — subtle soft shadow |
| `material-menu` | Moderate lift shadow |
| `material-modal` | Prominent shadow |
| `material-fullscreen` | Deepest shadow |

**Legacy default shadow:**
```css
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
/* or: --shadow: rgba(0, 0, 0, 0.12) */
```

**Note:** Exact `box-shadow` values per material type are computed by the `geist` package at runtime and not exposed as static CSS custom properties in public documentation.

---

## Z-Index Scale

| Context | Approximate z-index |
|---------|-------------------|
| Page content | 0–9 |
| Sticky headers / cards | ~100 (`z-100`) |
| Dropdowns / menus | ~200 |
| Modals | ~300 |
| Tooltips | ~400 |
| Fullscreen overlays | ~500+ |

---

## Component Library Overview

60+ components available from `geist/components`:

### Form Controls
`Input`, `Textarea`, `Checkbox`, `Radio`, `Select`, `Switch`, `Combobox`, `Calendar`, `Slider`

### Navigation
`Tabs`, `Menu`, `Pagination`, `Context Menu`, `Sidebar`

### Feedback & Overlays
`Toast`, `Modal`, `Drawer`, `Tooltip`, `Badge`, `Dialog`

### Data Display
`Table`, `Scroller`, `Skeleton`, `Progress`, `Code Block`, `Avatar`

### Layout
`Grid`, `Material`, `Stack`, `Browser`, `Phone`

### Other
`Button`, `Link`, `Separator`, `Spinner`, `Kbd` (keyboard shortcut)

---

## Implementation Patterns

### Installing Geist

```bash
npm install geist
```

### Font Setup (Next.js App Router)

```tsx
// app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### CSS Variable Usage

```css
/* Colors */
color: var(--ds-gray-1000);           /* primary text */
color: var(--ds-gray-900);            /* secondary text */
background: var(--ds-background-100); /* page background */
border-color: var(--ds-gray-400);     /* default border */
border-color: var(--ds-blue-700);     /* focus border */

/* Error state */
color: var(--ds-red-800);
background: var(--ds-red-100);

/* Warning state */
background: var(--ds-amber-100);
color: var(--ds-amber-900);

/* Success state */
color: var(--ds-green-700);
```

### Tailwind Typography Classes

```html
<!-- Heading -->
<h1 class="text-heading-32">Dashboard</h1>

<!-- Body copy -->
<p class="text-copy-14">Most common body text size.</p>

<!-- Strong modifier -->
<p class="text-copy-14"><strong>Bold emphasis</strong> in body text.</p>

<!-- Label with mono pairing -->
<span class="text-label-14">Status:</span>
<code class="text-label-14-mono">200 OK</code>

<!-- Tabular numbers -->
<td class="text-label-13 tabular-nums">1,234,567</td>
```

### Material Component

```tsx
import { Material } from 'geist/components';

// Card-style surface
<Material type="base">
  <div className="p-4">Card content</div>
</Material>

// Dropdown menu
<Material type="menu">
  <MenuItems />
</Material>

// Dialog
<Material type="modal">
  <DialogContent />
</Material>
```

### Dark Mode

Geist uses CSS custom properties that automatically switch between light and dark themes. The theme is stored in `localStorage` under the key `"zeit-theme"` with values `"light"`, `"dark"`, or `"system"`.

The `data-color-mode` attribute on the `<html>` element drives the active theme:

```html
<!-- Light mode -->
<html data-color-mode="light">

<!-- Dark mode -->
<html data-color-mode="dark">
```

All `--ds-*` CSS variables automatically resolve to the correct light/dark value based on this attribute.

---

## Sources

- [Geist Introduction](https://vercel.com/geist/introduction)
- [Geist Colors](https://vercel.com/geist/colors)
- [Geist Typography](https://vercel.com/geist/typography)
- [Geist Materials](https://vercel.com/geist/materials)
- [Geist Material Component](https://vercel.com/geist/material)
- [Geist Icons](https://vercel.com/geist/icons)
- [Geist Font GitHub](https://github.com/vercel/geist-font)
- [Geist Icons Figma](https://www.figma.com/community/file/1434291339972112007/geist-icons-vercel)
- [Geist Design System Figma](https://www.figma.com/community/file/1330020847221146106/geist-design-system-vercel)
- [DeepWiki — Geist Font Tailwind Integration](https://deepwiki.com/vercel/geist-font/4.4-tailwind-css-integration)
- [geist-colors (community)](https://github.com/ephraimduncan/geist-colors)
- [vercel-css-vars (community)](https://github.com/2nthony/vercel-css-vars)
