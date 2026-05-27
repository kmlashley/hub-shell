# Hub Design Configuration

This file is your brand control center. Every color, font, and name in the app is derived from what you define here. When you change something here, update `tailwind.config.ts` to match — that's the only other file you need to touch for brand changes.

---

## Hub Identity

```
HUB_NAME="My Hub"                  # Displayed in the sidebar header
HUB_TAGLINE="Your AI Business OS"  # Shown on the login page
```

---

## Brand Colors

Replace the hex values with your own. You need at least a primary, a dark (for text/sidebar), and a light (for backgrounds). The others are accents.

| Token | Role | Default Hex | Your Hex |
|-------|------|-------------|----------|
| `primary` | Buttons, active states, key accents | `#6366f1` (indigo) | ← change this |
| `dark` | Sidebar background, dark text | `#1e1b4b` | ← change this |
| `accent` | Secondary highlights, badges | `#10b981` (emerald) | ← change this |
| `gold` | Warnings, star ratings, alerts | `#f59e0b` | ← change this |
| `light` | Backgrounds, cards, canvas | `#f8f9ff` | ← change this |
| `border` | Dividers, input borders | `#e2e8f0` | ← keep or adjust |

**How to apply:** Open `tailwind.config.ts` and update the `colors` block to match whatever you put above.

---

## Typography

```
Heading font: "Playfair Display"   # Serif fonts feel editorial and distinct
Body font:    "Inter"               # Clean, readable at all sizes
```

Both fonts are loaded from Google Fonts. To change them, update `app/layout.tsx` where fonts are imported — there's a comment marking the spot.

Minimum sizes to keep readable:
- Body text: 16px
- Labels / metadata: 13px
- Never go below 12px for anything a user reads

---

## Layout

```
Sidebar width:  240px    # Don't go narrower than 220px
Content padding: 32px    # The space around page content
Max content width: 1200px
```

---

## Your Brand Voice (for AI agents)

This is the most important section. The agents in this hub write content using YOUR voice. Fill this in honestly — the more specific you are, the better the output.

```
YOUR_NAME="[Your name]"
YOUR_BUSINESS_NAME="[Business name]"
YOUR_NICHE="[1-2 sentences: who you serve and what you help them do]"
YOUR_AUDIENCE="[1-2 sentences: describe your ideal reader/buyer specifically]"
YOUR_TONE="[3 words that describe your writing voice — e.g., 'Direct, warm, practical']"
YOUR_CONTENT_GOALS="[What do you want content to do? Drive email signups? Sell a course? Build authority?]"
```

**Example:**
```
YOUR_NAME="Sarah Chen"
YOUR_BUSINESS_NAME="Slow Money Studio"
YOUR_NICHE="I help freelance designers build financial systems so they stop living paycheck to paycheck."
YOUR_AUDIENCE="Creative freelancers, 28-45, earning $60-120k/year, great at their craft but overwhelmed by money."
YOUR_TONE="Calm, practical, anti-hustle"
YOUR_CONTENT_GOALS="Build trust with my email list, warm people up to my $497 Money Intensive offer."
```

Once you've filled this in, paste the values into `lib/research/context.ts` — that file is what gets injected into every agent prompt.

---

## Navigation (Sidebar)

The default sidebar has these sections. Rename or remove items that don't apply to your business. Add new ones as you build.

**Core** (always visible, always useful):
- Dashboard
- AI Assistant
- Projects
- Notes

**Workspaces** (the meat of the hub — customize these):
- Intelligence → Research briefs, competitive analysis
- Content → Review queue, blog posts, post scorer
- Growth → Email, audience tracking
- Business → Clients, offers, revenue

**Operations** (under the hood):
- Agents → Agent status and manual triggers
- Analytics

To rename or restructure: edit the `NAV` array in `components/Sidebar.tsx`. Each item maps to a page route.

---

## Logo

If you have a logo, drop it in `public/logo.svg` (or `.png`). Then in `components/Sidebar.tsx`, replace the text header with an `<Image>` tag pointing to `/logo.svg`.

If you don't have a logo yet, the text header is fine. Just update `HUB_NAME` above.

---

## Checklist: Before You Start Building

- [ ] Filled in Hub Identity (name + tagline)
- [ ] Chosen brand colors and updated `tailwind.config.ts`
- [ ] Filled in Your Brand Voice section
- [ ] Pasted voice values into `lib/research/context.ts`
- [ ] Decided which sidebar items to keep/rename/remove
