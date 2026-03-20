# Design System Strategy: The Kinetic Terminal

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Kinetic Terminal."** 

This system rejects the static nature of traditional dashboards. It bridges the gap between high-stakes financial data (Bloomberg) and the visceral energy of live sports (ESPN). By combining a rigid, data-dense logic with "living" UI elements—such as glassmorphism, glowing states, and organic depth—we create a workspace that feels like a mission control center for the 2026 Bracket Lab. 

We break the "standard template" look through **intentional layering**. Rather than using lines to separate data, we use light and depth. The interface should feel like a multi-layered glass HUD (Heads-Up Display) hovering over a deep, infinite void.

## 2. Colors & Surface Logic
The palette is rooted in deep, atmospheric navies to allow high-energy accents to "pop" without causing eye fatigue during long analytical sessions.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be achieved through background shifts or tonal transitions.
- Use `surface_container_low` for secondary modules.
- Use `surface_container_high` for primary data focal points.
- *Rationale:* Lines create visual noise. Tonal shifts create "zones" of focus.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
- **Base Layer:** `surface` (#0a0f14) – The infinite foundation.
- **Section Layer:** `surface_container` (#141a20) – Defines major content areas.
- **Interaction Layer:** `surface_bright` (#252d35) – For hover states or active modules.

### The Glass & Gradient Rule
To achieve the "Premium Terminal" feel:
- **Glassmorphism:** Use `surface_variant` at 60% opacity with a `20px` backdrop blur for floating overlays or navigation sidebars.
- **Signature Glows:** Use a linear gradient from `primary` (#ff9159) to `primary_container` (#ff7a2f) for primary actions. This creates a "heated" energy that flat colors lack.

## 3. Typography: The Editorial Edge
We use a tri-font system to balance readability with high-impact sports branding.

*   **Display & Headlines (Plus Jakarta Sans):** Used for "The Big Story." Bold weights convey authority and momentum.
*   **Body & Titles (Inter):** The workhorse. Used for high-density data tables and descriptive text. Its neutral character ensures the data remains the hero.
*   **Labels (Space Grotesk):** Monospaced-adjacent feel. Used for timestamps, seed numbers, and technical metrics to lean into the "Terminal" aesthetic.

**Hierarchy Goal:** A user should be able to squint and still identify the winning team and the highest probability outcome purely through typographic scale.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "web 2.0." We use **Ambient Depth**.

*   **The Layering Principle:** Place a `surface_container_lowest` (#000000) card on a `surface_container_low` section to create a "sunken" data well. Conversely, place a `surface_container_highest` module on a `surface` background to create "lift."
*   **Ambient Shadows:** For floating modals, use a shadow with a `48px` blur, `0%` spread, and `8%` opacity. The shadow color must be `on_surface` (#e7ebf3) to mimic the way light catches the edges of glass in a dark room.
*   **Ghost Borders:** When accessibility requires a container edge, use `outline_variant` (#43484e) at **15% opacity**. It should be felt, not seen.

## 5. Components & Primitive Styling

### Cards & Data Modules
*   **Constraint:** Zero dividers. Use vertical white space `spacing.8` (1.75rem) to separate content.
*   **Corner Radius:** Consistently use `md` (12px / 0.75rem) for all containers.
*   **Interactive State:** On hover, a card should transition from `surface_container` to `surface_bright` with a subtle `primary` outer glow (4px blur, 10% opacity).

### High-Energy Buttons
*   **Primary:** `primary` background, `on_primary` text. No border. Subtle 2px bottom-weighted inner-glow for a "tactile plastic" look.
*   **Secondary:** `surface_variant` background with a `secondary` ghost border (20% opacity).
*   **Tertiary:** Text-only using `secondary_fixed` for high visibility without bulk.

### Data Tables (The Bloomberg Edge)
*   **Header:** `label-md` in `on_surface_variant`. All caps with 0.05em letter spacing.
*   **Rows:** Alternating background between `surface` and `surface_container_low`. 
*   **Positive Framing:** For "Alive" teams, use `secondary` (teal) or `tertiary` (purple) accents. For "Eliminated" teams, do not use red. Instead, drop the opacity of the entire row to **40%** and desaturate.

### Progress & Odds Bars
*   Use `secondary` (teal) for standard progress and `tertiary` (purple) for "upset" potential. 
*   Always include a "Glow Head"—a 2px wide `secondary_fixed` bright point at the end of a progress bar to indicate forward momentum.

## 6. Do’s and Don’ts

### Do
*   **Do** use `spacing.2.5` (0.5rem) for tight data clusters and `spacing.8` (1.75rem) for section breaks.
*   **Do** use "Positive Framing." If a team is out, they simply "fade into the background" while the winners stay in the light.
*   **Do** use `surface_tint` as a very subtle overlay on images to integrate them into the dark navy environment.

### Don't
*   **Don't** use Red. Red is for errors, not for sports results. Use opacity and grayscale for negative states.
*   **Don't** use 100% white (#ffffff) for text. Use `on_surface` (#e7ebf3) to prevent "haloing" on dark backgrounds.
*   **Don't** use standard "Drop Shadows." Use the surface nesting logic described in Section 4.
*   **Don't** use rounded-full (pills) for data containers; keep the `md` (12px) radius to maintain a professional "terminal" structure. Use pills only for small status chips.