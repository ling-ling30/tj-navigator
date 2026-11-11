---
id: 5
title: Design system and screen spec
labels: [wayfinder:prototype]
mode: decided-unattended
status: closed
assignee: antigravity-gemini
blocked_by: [3, 4]
blocks: []
map: ../map.md
---

# #5 UI redesign spec

## Question

What is the design system and the spec for the four screens (Home/Search, Results, Journey detail, Live radar) plus stop-search, so the rebuild is consistent and readable?

## Resolved when

`docs/UI-REDESIGN-SPEC.md` exists with: tokens (colour, one type scale, one spacing scale, radius, touch target), component inventory and folder architecture (`src/components/ui/*` primitives, `src/features/*`, hooks, `src/i18n/*` with `id` and `en`), per-screen layout, Bahasa Indonesia copy deck, states (loading, empty, error, offline, no route), and a fix-list mapping to the logic defects from #2. Use `design-taste-frontend` app-screen mode (`draw.mjs --app`). Link the file under `## Resolution`.

## Resolution

The UI redesign specification is complete and recorded in [`docs/UI-REDESIGN-SPEC.md`](../../docs/UI-REDESIGN-SPEC.md).

Key decisions specified:
- **Design system & tokens**: Strict Achromatic Ledger base with Deep Transit Blue (`#004B87`) as the single primary action colour. Transit line colours (TJ, KRL, MRT, LRT, Mikrotrans) are isolated tokens. Strict semantic colours (Red, Green, Amber) reserved exclusively for delays, live GPS, and transfer risk. Zero glass, zero gradients, zero resting shadows, minimum 12px font size, sentence case everywhere. Exact CSS custom properties and Tailwind v4 `@theme` bindings defined for `src/styles/tokens.css` and `src/styles/index.css`.
- **Component & folder architecture**: Decomposed `src/components/ui/*` primitives (≤ 150 lines), feature modules (`src/features/{search,results,journey,radar,stop-picker}/*`), state decoupled via custom hooks (`src/hooks/*`), bilingual i18n (`src/i18n/{id,en}.ts` and `useT`).
- **Screen specs & ASCII wireframes**: Formatted for 360×800 and 390×844 mobile viewports covering Home/Search, Results, Journey detail, Live radar, and Stop picker with clear hierarchy and single primary actions.
- **Copy deck**: Exhaustive Bahasa Indonesia default copy deck with English equivalents covering all operational, empty, error, offline, and stale-data states.
- **Implementation roadmap**: 8 independently buildable slices starting with tokens, primitives, and map removal, and culminating in design skill inspection (`inspect.mjs --app`) and logic defect fixes from ticket #2.
