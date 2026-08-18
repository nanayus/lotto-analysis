# AGENTS.md

## Project Overview

This repository is a mobile-first Lotto 6/45 data exploration app.

The product is **not a prediction service**. It is a playful, premium data-exploration experience based on historical draw data.

Primary product copy:

> 번호는 무작위. 보는 방식은 다르게.

Target platforms:

- iOS
- Android
- Mobile Web
- Desktop Web support where practical

The UI should feel:

- minimal
- premium
- calm
- Apple-like
- data-focused
- interactive without looking like a game or casino

Avoid traditional lottery-site visual language.

---

# 1. Tech Stack

Use the existing project stack unless explicitly instructed otherwise.

Primary stack:

- React Native
- Expo
- TypeScript
- Expo Router
- React Native Reanimated
- React Native Gesture Handler
- Expo Haptics
- React Native Skia where already used for custom Scrubber visuals

Do not add a new state-management library unless explicitly requested.

Do not add a backend unless explicitly requested.

Do not add new dependencies for small UI changes unless absolutely necessary.

---

# 2. Current Architecture

Keep the architecture simple.

Preferred flow:

```text
UI
↓
Domain
↓
Repository
↓
Generated Static Data
```

Rules:

- UI must not contain analytics/scoring logic.
- Domain functions should be pure and have no React imports.
- Static generated data is the runtime source for analytics.
- Do not calculate global analytics at app startup if they can be precomputed.
- Keep components focused and avoid unnecessary abstraction layers.

---

# 3. App Navigation

Current main navigation:

- 탐색
- 조합 만들기

Do not add new screens, routes, or tabs unless explicitly requested.

Bottom navigation should remain visually subtle.

---

# 4. Explore Screen Layout

Explore is split into two functional zones.

## LEFT
Number exploration / NumberScrubber.

## RIGHT
Selected-number analytics.

Conceptually:

```text
┌──────────────┬──────────────────────────────┐
│              │                              │
│ Number       │ Selected Number Analytics    │
│ Scrubber     │                              │
│              │ Recent / Frequency / Pair    │
│              │ Trio / other analysis        │
│              │                              │
└──────────────┴──────────────────────────────┘
```

Default layout intent:

- LEFT approximately 30%
- RIGHT approximately 70%

Small mobile may allow LEFT approximately 31–32%.

Do not make the LEFT pane visually wider than necessary.

Do not add a second pane-divider line.

The Magnetic Rail is the only primary vertical structural line between the two visual zones.

---

# 5. Independent Scrolling

LEFT and RIGHT are independent interaction regions.

## LEFT
Scrolls the NumberScrubber.

Must support where practical:

- touch scrolling
- touch flick / momentum
- mouse wheel
- trackpad
- PC/web scrolling

## RIGHT
Scrolls analytics content only.

Important:

- Scrolling LEFT must not scroll RIGHT.
- Scrolling RIGHT must not scroll LEFT.
- Decorative overlays must not block wheel/touch input.

---

# 6. NumberScrubber Design Direction

The current design direction is a:

**Magnetic Fisheye Kinetic Scrubber**

It is not a conventional slider.

It should feel like the user is scrolling / scrubbing the number scale through a fixed focus point.

Core characteristics:

- continuous number movement
- kinetic / momentum scrolling
- selected number becomes significantly larger
- nearby numbers progressively shrink and fade
- Magnetic Rail reacts subtly to interaction
- interaction remains calm and premium

Do not implement the number interaction as discrete text replacement.

All number visuals should be derived from a continuous scroll position.

---

# 7. NumberScrubber Rendering Responsibilities

Preferred responsibility split:

## ScrollView
Owns primary scrolling / native wheel / touch momentum behavior where possible.

## Reanimated
Owns continuous derived visual interpolation:

- number scale
- opacity
- translate
- selected-number emphasis
- velocity-reactive state

## Skia
Owns custom graphical effects already present in the Scrubber:

- Magnetic Rail
- curved geometry
- localized accent
- subtle visual deformation

Do not rewrite this architecture during small UI refinement tasks unless explicitly instructed.

---

# 8. Fisheye Typography

Selected number must be the primary visual focus.

General visual hierarchy:

- selected number: clearly largest / strongest
- distance 1: noticeably smaller
- distance 2: smaller and dimmer
- distance 3+: quiet
- far numbers: very subtle

Recommended perceived targets:

```text
distance 0
34–38px
opacity 1.0

distance 1
22–24px
opacity ~0.60–0.68

distance 2
17–19px
opacity ~0.35–0.42

distance 3
14–16px
opacity ~0.18–0.24

distance >= 4
12–14px
opacity ~0.08–0.14
```

Prefer a fixed base font size with scale transforms if it produces smoother animation.

Avoid strong horizontal movement.

Primary emphasis should come from:

1. scale
2. opacity
3. vertical movement

Horizontal translation should remain subtle, typically 0–4px.

---

# 9. Number / Rail Collision

Number labels must never overlap the Magnetic Rail.

Maintain an explicit safe gap.

Conceptually:

```text
number label
    ↓
safe gap
    ↓
tick
    ↓
rail
```

When selected numbers scale up, compensate positioning so the number grows mainly away from the rail.

Do not allow scale animation to push text into the rail.

---

# 10. Magnetic Rail

There must be only one main vertical rail.

Do not render a second white/gray divider beside it.

The rail should:

- be thin
- remain visually subtle
- use a muted base tone
- show accent primarily around the selection focus
- deform smoothly around the focus marker
- react subtly to scroll velocity

Do not make the entire rail bright purple.

The accent should be localized around the focus region.

---

# 11. Rail Motion

Rail motion should be derived from current interaction state.

Preferred behavior:

```text
idle
→ subtle resting curve

slow scroll
→ slightly deeper deformation

fast scroll
→ deformation increases to a bounded maximum

deceleration
→ deformation gradually relaxes

idle
→ subtle resting curve
```

Important:

- no sharp corners
- no translated prebuilt S-curve trick
- no extreme wobble
- no strong neon effect
- no sci-fi control-panel look

Use smooth geometry and restrained motion.

---

# 12. Rail Velocity Saturation

Do not map raw velocity directly to unlimited deformation.

Use a visual velocity cap.

Once the maximum visual velocity is reached:

- rail depth stops increasing
- accent length stops increasing
- focus marker reaction stops increasing

Extreme input should remain visually stable.

---

# 13. Focus Marker

The old large white circular thumb is not the target design.

Current preferred direction:

**small focus capsule / pill**

The marker represents the current selection focus, not a traditional slider thumb.

Preferred characteristics:

- compact
- near-white
- subtle
- visually integrated with the rail
- less prominent than the selected number

Initial guidance:

- width approximately 18–22
- height approximately 30–34
- fully rounded pill/capsule radius
- very subtle shadow
- no large glow

Avoid:

- large white circle
- oversized knob
- obvious settings-control appearance
- large arrows
- floating orb look

The marker must not become the visual hero.

Priority order:

1. selected number
2. Magnetic Rail focus region
3. focus marker
4. nearby numbers
5. far numbers

---

# 14. Left / Right Interaction Focus

Explore has three interaction states:

```ts
type InteractionFocus =
  | "LEFT"
  | "RIGHT"
  | "IDLE";
```

Do not aggressively resize the layout when focus changes.

Prefer **visual emphasis changes** over width animation.

## LEFT active
When the user scrolls / wheels / flicks LEFT:

- selected number emphasis can increase slightly
- rail accent can increase slightly
- focus marker can become slightly clearer
- LEFT presence increases
- RIGHT becomes slightly calmer

## RIGHT active
When the user scrolls RIGHT:

- LEFT rail can become slightly quieter
- selected number emphasis can reduce slightly toward base
- focus marker becomes quieter
- RIGHT reading area becomes visually dominant

## IDLE
Both sides return to balanced resting emphasis.

Suggested transition range:

- about 160–220ms
- idle return delay about 180–320ms

Avoid layout jitter and text reflow.

---

# 15. Kinetic Scrolling

Fast scrolling must remain visible and controllable.

The user should experience:

```text
flick
↓
numbers glide
↓
visible deceleration
↓
last numbers become easier to track
↓
soft settle
```

Do not allow one strong input to instantly travel across almost the entire 1–45 range.

The animation should remain visible enough that the fisheye and rail effects can be perceived.

---

# 16. Kinetic Speed Limits

The Scrubber must impose reasonable limits on extreme input.

Use both:

1. effective velocity limiting
2. maximum momentum travel limiting

Recommended starting behavior per interaction burst:

- light flick: ~1–3 numbers
- normal fast flick: ~4–7 numbers
- strong flick: ~8–10 numbers
- extreme input: ~10–12 numbers maximum

Initial tuning suggestion:

```ts
NUMBER_STEP = 48;

MAX_FLING_ITEMS = 9;
MAX_EXTREME_FLING_ITEMS = 11;

MAX_FLING_VELOCITY = 1600..1900; // tune after testing
```

Exact values must live in config/constants and remain easy to tune.

A single strong flick must not produce behavior similar to:

```text
1 → 45
```

---

# 17. Web / PC Wheel Handling

Web/PC is a first-class interaction target for the Scrubber prototype.

LEFT pane must respond to:

- mouse wheel
- trackpad

Do not rely only on touch or pan gestures.

Very large wheel delta values should be governed so one event or burst cannot cause extreme travel.

Possible approaches:

- per-event delta clamp
- per-frame accumulated delta clamp
- wheel-burst travel clamp

Do not make wheel scrolling rigidly one-number-per-wheel-step.

Momentum should still feel fluid.

---

# 18. Momentum Interruption

If momentum is active and the user interacts again:

- touch
- wheel
- trackpad

the previous momentum must immediately yield to the new input.

The user must always feel in control.

---

# 19. Snap

When scrolling settles, align to the nearest integer number.

Final settle should be:

- short
- soft
- low-bounce

Suggested visual duration:

approximately 150–220ms.

Do not create a toy-like bounce.

---

# 20. Haptics

Native only.

For slow/direct interaction:

- one small selection haptic when crossing an integer boundary is allowed.

For fast momentum:

- do not fire strong haptics for every number.
- suppress or aggressively throttle.

Final settle may use one subtle haptic.

Web has no haptic.

---

# 21. Color System

Use the existing palette.

```text
background       #080A12
surface          #111522
textPrimary      #F5F7FA
textSecondary    #7D8597
divider          #202636

accentPrimary    #7C8CFF
accentSecondary  #42D6C7

hot              #FF6B81
neutral          #8D96A8
cold             #59B8FF

highlight        #DCE2FF
```

Do not introduce traditional Lotto ball colors.

Avoid:

- rainbow UI
- strong neon
- casino visuals
- glossy lottery balls
- excessive gradients

---

# 22. Visual Tone

The UI should feel:

- calm
- premium
- minimal
- modern
- precise
- tactile

Avoid:

- decorative demo UI
- thermostat-like controls
- sci-fi dashboard look
- excessive motion
- exaggerated spring physics

The motion should support understanding and delight, not distract.

---

# 23. Dark Theme

MVP uses dark theme only.

Do not add light theme unless explicitly requested.

Use system fonts.

Do not add custom font dependencies for small visual refinements.

---

# 24. Mobile Web / Desktop Width

Mobile web should remain the primary layout reference.

On wider desktop screens, keep the main app visually contained rather than stretching the UI excessively.

Preferred desktop container:

approximately max-width 500px unless an explicit desktop layout task says otherwise.

---

# 25. Analytics Scope

MVP analytics uses main six winning numbers only.

Bonus number is excluded from analytics for now.

Long-term metrics:

- appearance count
- appearance rate
- appearance rank
- average gap
- current gap
- max gap
- pair
- trio

Recent window:

- latest 52 draws

Recent short window:

- latest 5 draws

Do not change analytics definitions during UI tasks.

---

# 26. HOT / COLD

HOT / COLD is based on recent 52-draw frequency percentile.

Keep existing domain implementation if already built.

Status labels:

- HOT
- NEUTRAL
- COLD

Do not change these labels during UI-only work.

---

# 27. Pair / Trio

Pair:

For selected N, count draws where N and X appeared together among the six main winning numbers.

Trio:

Count draws where N + X + Y appeared together among the six main winning numbers.

Do not alter pair/trio logic unless explicitly requested.

---

# 28. Combination Maker

Product language:

- 조합 만들기
- 만든 조합

Do not use:

- 추천 번호
- prediction language

Criteria:

- HOT
- COLD
- RECENT
- PAIR
- TRIO

HOT and COLD must be mutually exclusive.

If no criterion is selected:

generate a uniform random six-number combination.

Do not change combination logic during UI-only tasks.

---

# 29. Data

MVP uses static bundled data.

No runtime network request is required for core features.

Source of truth:

official Korean Lotto / 동행복권 historical draw data.

Generated runtime data should be separate from raw input data.

Suggested structure:

```text
data/raw/lotto-draws.json

src/data/generated/metadata.json
src/data/generated/number-stats.json
src/data/generated/pair-counts.json
src/data/generated/trio-counts.json
```

Do not introduce SQLite for MVP.

---

# 30. State Management

For MVP, prefer local React state where reasonable.

Do not add Zustand just for convenience.

Only consider global state management if the product later adds features such as:

- saved combinations
- user settings
- history
- login
- persisted user state

---

# 31. Performance Rules

Do not update React state every scroll frame.

Use Reanimated Shared Values for frame-level interaction.

React state should update only when a meaningful integer selection or UI state changes.

Avoid heavy JS work during scrolling.

Do not:

- run analytics calculations every frame
- map/filter large data during animation
- trigger JSON processing during interaction
- remount the entire right pane when selectedNumber changes

Target smooth interaction.

---

# 32. Accessibility

Maintain:

- touch targets >= 44pt where applicable
- readable contrast
- text/status in addition to color
- accessible selected-number label
- reduced-motion considerations

Decorative Skia layers should not pollute the accessibility tree.

---

# 33. Scope Discipline

For small UI refinement requests:

**change only what was requested.**

Do not use a small task as an excuse to:

- rewrite architecture
- rename unrelated files
- refactor unrelated code
- add dependencies
- create new abstractions
- redesign other screens
- implement future features

Prefer the smallest correct patch.

---

# 34. Codex Working Style

When receiving a small UI task:

1. inspect only the relevant files first
2. identify the smallest patch
3. modify only required files
4. do not rewrite working architecture
5. do not continue into unrelated improvements
6. stop once the requested change is complete

Do not perform broad repository refactors unless explicitly requested.

---

# 35. Validation Strategy

Do not run the full test suite after every tiny visual change unless explicitly requested.

Use the following default:

## Small UI patch
Run:

- relevant TypeScript/typecheck check if practical
- targeted check for edited code

Do not automatically run every test in the repository.

## Medium interaction change
Run:

- typecheck
- targeted lint
- relevant tests

## Major feature / phase completion
Run:

- full typecheck
- lint
- unit tests
- requested platform validation

If the user explicitly asks for full validation, run it.

Never claim a test or platform was checked if it was not actually run.

---

# 36. Iteration Speed

This project is currently in rapid UI/interaction iteration.

Optimize for:

**small patch → preview → user review → next patch**

rather than:

**large rewrite → full validation → unrelated cleanup**

Keep interactive design iteration fast.

---

# 37. No Unrequested Cleanup

Do not automatically:

- clean unrelated warnings
- reformat the whole repository
- migrate libraries
- update package versions
- replace working components
- rename unrelated modules
- optimize unrelated code

unless the requested task directly depends on it.

---

# 38. Dependencies

Before adding a new package:

1. confirm the current stack cannot reasonably implement the requested behavior
2. explain why the dependency is needed
3. avoid adding it if the change can be done cleanly with existing dependencies

For small UI refinements, default to no new dependency.

---

# 39. Comments and Documentation

Keep code understandable.

Add comments only where behavior is non-obvious, especially:

- scroll physics
- velocity clamping
- rail deformation math
- interpolation logic

Do not over-comment straightforward JSX or styling.

---

# 40. Definition of Done for Small UI Tasks

A small UI task is done when:

- the requested change is implemented
- existing interaction architecture still works
- obvious TypeScript errors are absent
- no unrelated features were changed
- no unnecessary dependency was added

Then stop.

Do not continue developing additional features.

---

# 41. Current Product Priority

Right now the highest-priority experience is the Explore NumberScrubber.

The desired feeling is:

```text
scroll
↓
numbers flow
↓
selected number grows
↓
rail responds
↓
fast input creates bounded momentum
↓
motion decelerates visibly
↓
focus settles cleanly
```

The user should feel that the app is:

**pleasant to explore**

not that it is trying to predict Lotto results.

---

# 42. Final Product Principle

Whenever there is a tradeoff between:

- more visual effects
- better clarity
- smoother interaction

prefer:

1. clarity
2. smooth interaction
3. restrained visual delight

Do not sacrifice usability for decorative animation.
