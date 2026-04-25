# Bresca Design System

## Company Overview

**Bresca** is a health data portability platform with the tagline **"Health Data Autonomy"**.

### Products / Segments

1. **B2C — Patient Portal**: A secure personal vault for storing medical imaging studies (DICOM, etc.), independent of health system, country, or imaging provider. Users own their data permanently.
2. **B2B / CRO Data Platform**: Anonymized, traceable, consent-authorized health data provisioned to Clinical Research Organizations (CROs) for use by global pharmaceutical laboratories.

### Context
Medical study portability is a widespread, unsolved problem across the Americas. Patients lose access to imaging when they change providers, countries, or insurers. Bresca solves this at the individual level, while monetizing through the CRO data marketplace — a segment with significant budget and urgent need for clean, traceable datasets.

### Sources
- Logo assets provided directly (see `assets/` folder)
- No codebase or Figma link provided — design system built from brand assets and brief
- Uploaded logos: horizontal bicolor, horizontal negative, vertical blue, vertical positive (dark bg), vertical green (transparent bg), square lockup

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **B2C**: Warm, empowering, clear. Speaks directly to the patient. "Your studies, always with you." First-person ("your", "you") language. No jargon. Conversational but trustworthy.
- **B2B/CRO**: Authoritative, precise, data-driven. Speaks to researchers and procurement. Uses technical vocabulary: "trazable", "consented", "anonymized datasets", "CRO-ready".

### Language
- Bilingual brand (Spanish/English). Tagline in English ("Health Data Autonomy"). Marketing copy may be Spanish-first for LATAM audiences.
- Casing: Logo/tagline in ALL CAPS with wide letter-spacing. Headlines in Title Case or sentence case depending on context.
- Tagline: **HEALTH DATA AUTONOMY** — always in wide-tracked uppercase.

### Copy Examples
- "Tus estudios médicos, siempre contigo."
- "Portabilidad real. Sin fronteras. Sin sistemas."
- "Clean data. Consented. Traceable. Ready for research."
- "Independizate del sistema de salud."

### Emoji
No emoji used in brand communication. The brand relies on clean typography and iconography.

---

## VISUAL FOUNDATIONS

### Color System
| Token | Value | Usage |
|---|---|---|
| `--green` | `#00C87A` | Primary CTA, B2C accent, logo left |
| `--blue` | `#4B6EF5` | Secondary, B2B accent, logo right |
| `--teal` | `#00B8D4` | Gradient midpoint, supporting |
| `--black` | `#0A0A0A` | CRO dark background |
| `--dark` | `#111827` | Dark surface |
| `--white` | `#FFFFFF` | B2C background, light surface |
| `--gray-50` | `#F8FAFC` | Subtle background tints |
| `--gray-100` | `#F1F5F9` | Card backgrounds |
| `--gray-200` | `#E2E8F0` | Borders, dividers |
| `--gray-500` | `#64748B` | Secondary text |
| `--gray-800` | `#1E293B` | Dark body text |

### Gradients
- **Brand gradient**: `linear-gradient(135deg, #00C87A 0%, #00B8D4 50%, #4B6EF5 100%)` — green → teal → blue. Used on the bicolor logo, CTAs, hero accents.
- **Dark gradient** (CRO): `linear-gradient(135deg, #111827 0%, #0A0A0A 100%)`

### Typography
- **Display / Logo**: Custom geometric bold (similar to Space Grotesk ExtraBold or Syne ExtraBold). Very wide, heavy, no condensing.
- **Substitute**: `'Space Grotesk'` from Google Fonts (weights 400, 500, 700) — *substitution flagged, see below*
- **Tagline / Labels**: Wide-tracked uppercase, lighter weight. `letter-spacing: 0.15em–0.25em`
- **Body**: Clean geometric sans, moderate weight. Space Grotesk 400/500.

### Spacing & Layout
- Base unit: 8px grid
- Section padding: 80–120px vertical
- Container max-width: 1200px
- Border radius: 8px (cards), 100px (pill buttons), 4px (inputs)

### Backgrounds
- B2C: White base with subtle `--gray-50` sections; green/blue accent lines or gradient text
- CRO: Full-bleed black with neon green/blue accents; grid or dot pattern overlays acceptable

### Cards
- Light: white bg, `box-shadow: 0 2px 16px rgba(0,0,0,0.08)`, `border-radius: 12px`
- Dark: `#1a1a2e` bg, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 12px`

### Buttons
- Primary: `background: linear-gradient(135deg, #00C87A, #4B6EF5)` or solid green/blue depending on context. `border-radius: 100px`. Bold, uppercase or title-case label.
- Secondary: outlined, `border: 2px solid currentColor`, transparent fill
- Hover: slight brightness increase (`filter: brightness(1.1)`) + subtle scale (`transform: scale(1.02)`)
- Press: `transform: scale(0.98)`

### Animation
- Easing: ease-out for entrances, ease-in-out for transitions
- Duration: 200ms (micro), 400ms (page transitions), 600ms (hero reveals)
- Fade + translate-y (upward 12px) for content reveals
- No bounces; brand is trustworthy/medical, not playful

### Shadows
- Elevation 1: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- Elevation 2: `0 4px 16px rgba(0,0,0,0.08)`
- Elevation 3: `0 8px 32px rgba(0,0,0,0.12)`
- Dark glow (CRO): `0 0 32px rgba(0,200,122,0.15)`

### Imagery
- Clean, clinical-adjacent but human. Real people, medical contexts, clear light.
- CRO: abstract data visualization, grid patterns, dark backgrounds
- No heavy photo filters; cool-neutral color grade preferred

### Borders & Dividers
- Light: `1px solid #E2E8F0`
- Dark: `1px solid rgba(255,255,255,0.08)`
- Accent: `2px solid #00C87A` (selected states, highlights)

### Corner Radii
- Buttons: 100px (pill)
- Cards: 12px
- Inputs: 8px
- Badges/chips: 100px

---

## ICONOGRAPHY

No proprietary icon system provided. The brand uses:
- **Lucide Icons** (CDN: `https://unpkg.com/lucide@latest`) — clean, 2px stroke, rounded ends. Consistent with brand's geometric, open feel.
- Medical-adjacent icons: shield, database, lock, file-text, activity, share, globe
- The logo itself contains iconic elements: `+` (medical cross), horizontal bars in "E" position (representing stacked records/data)
- No emoji used as icons

---

## FILE INDEX

```
README.md                          — This file
colors_and_type.css                — CSS variables for colors, type, spacing
SKILL.md                           — Agent skill definition

assets/
  logo-square.png                  — Square lockup (color)
  logo-horizontal-bicolor.png      — Horizontal gradient logo
  logo-horizontal-negative.png     — Horizontal black/mono logo
  logo-vertical-blue.png           — Vertical blue monochrome
  logo-vertical-positive.png       — Vertical white on black
  logo-vertical-green.png          — Vertical green, transparent bg

preview/
  colors-brand.html                — Brand color swatches
  colors-neutral.html              — Neutral/gray scale
  colors-semantic.html             — Semantic colors (success, error, etc.)
  type-scale.html                  — Display + heading type scale
  type-body.html                   — Body + label + caption type
  spacing-tokens.html              — Spacing & radius tokens
  shadows-elevation.html           — Shadow / elevation system
  buttons.html                     — Button variants
  inputs.html                      — Form inputs
  cards.html                       — Card components
  badges.html                      — Badges and chips
  logos.html                       — Logo usage guide

ui_kits/
  b2c/
    index.html                     — Consumer landing page (white/blue)
    Header.jsx
    Hero.jsx
    Features.jsx
    Footer.jsx
  cro/
    index.html                     — CRO landing page (black/dark)
    Header.jsx
    Hero.jsx
    DataSection.jsx
    Footer.jsx
```
