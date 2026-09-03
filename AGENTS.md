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

Current primary stack:

- React Native
- Expo
- TypeScript
- Expo Router
- React Native Reanimated
- React Native Gesture Handler
- Expo Haptics
- React Native Skia where already used for custom Scrubber visuals

Do not:

- replace the current framework
- migrate the project to another architecture
- create a new Expo project
- replace Expo Router
- introduce another routing solution
- add a new state-management library unless explicitly requested
- add a backend unless explicitly requested
- add new dependencies for small UI changes unless absolutely necessary

The existing repository implementation is more authoritative than assumptions based on this document.

---

# 2. Repository Is the Source of Truth

Before implementing a feature, inspect the actual repository.

The current implementation is the source of truth for:

- package versions
- framework versions
- routing
- navigation
- folder structure
- styling system
- theme tokens
- component structure
- state management
- data paths
- generated data structure
- build configuration
- existing analytics behavior

Do not replace an existing implementation merely because this document describes a preferred or suggested structure differently.

If the repository and this document conflict in a way that materially affects the requested feature:

1. inspect the relevant implementation
2. do not silently restructure the project
3. do not guess
4. report the conflict or ask the user before proceeding

Preserve working architecture whenever possible.

---

# 3. No Silent Assumptions

Do not make silent assumptions about:

- data semantics
- Lotto analytics definitions
- existing filters
- bonus-number behavior
- generated-data fields
- navigation behavior
- state ownership
- existing components
- feature scope

If behavior can be confirmed from the repository, inspect it first.

If it still cannot be determined, ask the user before implementing.

Do not invent missing data or redefine existing analytics to make implementation easier.

---

# 4. Current Architecture

Keep the architecture simple.

Preferred existing flow:

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
- Static generated data is the runtime source for analytics where currently applicable.
- Do not calculate global analytics at app startup if they can be precomputed.
- Keep components focused.
- Avoid unnecessary abstraction layers.
- Do not rewrite the architecture during feature work unless explicitly requested.

---

# 5. App Navigation

Current main navigation:

- 탐색
- 조합 만들기

These are two different product experiences.

```text
탐색
└─ individual-number exploration and analytics

조합 만들기
└─ user-selected six-number combination analysis
```

Do not merge these concepts.

Do not add a new top-level tab unless explicitly requested.

Feature-specific child/detail screens may be added only when required by the approved feature specification.

Bottom navigation should remain visually subtle.

---

# 6. Explore Feature Scope

The `탐색` tab is the existing individual-number analysis experience.

Its purpose is to explore one Lotto number at a time.

It currently includes concepts such as:

- NumberScrubber
- selected-number analytics
- appearance count
- appearance rank
- recent flow
- gap analytics
- HOT / COLD
- pair
- trio

The Explore feature is already implemented.

When developing `조합 만들기`, do not redesign or rewrite Explore.

Do not modify existing Explore analytics definitions merely to support Combination Analysis.

Reuse existing components or domain functions only when doing so is safe and does not alter their existing behavior.

---

# 7. Explore Screen Layout

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

# 8. Independent Scrolling

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

# 9. NumberScrubber Design Direction

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

# 10. NumberScrubber Rendering Responsibilities

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

# 11. Fisheye Typography

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

# 12. Number / Rail Collision

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

# 13. Magnetic Rail

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

# 14. Rail Motion

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

# 15. Rail Velocity Saturation

Do not map raw velocity directly to unlimited deformation.

Use a visual velocity cap.

Once the maximum visual velocity is reached:

- rail depth stops increasing
- accent length stops increasing
- focus marker reaction stops increasing

Extreme input should remain visually stable.

---

# 16. Focus Marker

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

# 17. Left / Right Interaction Focus

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

# 18. Kinetic Scrolling

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

# 19. Kinetic Speed Limits

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

# 20. Web / PC Wheel Handling

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

# 21. Momentum Interruption

If momentum is active and the user interacts again:

- touch
- wheel
- trackpad

the previous momentum must immediately yield to the new input.

The user must always feel in control.

---

# 22. Snap

When scrolling settles, align to the nearest integer number.

Final settle should be:

- short
- soft
- low-bounce

Suggested visual duration:

approximately 150–220ms.

Do not create a toy-like bounce.

---

# 23. Haptics

Native only.

For slow/direct interaction:

- one small selection haptic when crossing an integer boundary is allowed.

For fast momentum:

- do not fire strong haptics for every number.
- suppress or aggressively throttle.

Final settle may use one subtle haptic.

Web has no haptic.

---

# 24. Color System

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

# 25. Visual Tone

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

# 26. Dark Theme

MVP uses dark theme only.

Do not add light theme unless explicitly requested.

Use system fonts.

Do not add custom font dependencies for small visual refinements.

---

# 27. Mobile Web / Desktop Width

Mobile web should remain the primary layout reference.

On wider desktop screens, keep the main app visually contained rather than stretching the UI excessively.

Preferred desktop container:

approximately max-width 500px unless an explicit desktop layout task says otherwise.

---

# 28. Explore Analytics Scope

This section applies to the existing `탐색` individual-number feature.

Do not reinterpret it as a global rule for all future analytics.

Current Explore analytics use the existing implementation and definitions.

Existing long-term metrics include:

- appearance count
- appearance rate
- appearance rank
- average gap
- current gap
- max gap
- pair
- trio

Existing recent windows include:

- latest 52 draws
- latest 5 draws

Bonus-number handling for Explore must remain consistent with the current implementation unless an Explore-specific task explicitly changes it.

Do not change Explore analytics definitions while implementing Combination Analysis.

---

# 29. HOT / COLD

HOT / COLD is part of the existing Explore feature.

Keep existing domain implementation if already built.

Status labels:

- HOT
- NEUTRAL
- COLD

Do not change these labels during unrelated work.

---

# 30. Pair / Trio

This section applies to the existing individual-number Explore analytics.

Pair:

For selected N, count draws where N and X appeared together according to the existing implementation.

Trio:

Count draws where N + X + Y appeared together according to the existing implementation.

Do not alter pair/trio logic unless explicitly requested.

---

# 31. Combination Analysis — Product Definition

The `조합 만들기` tab is the six-number combination analysis feature.

The previous placeholder screen should be replaced by this feature.

There is currently no implemented HOT/COLD/RECENT/PAIR/TRIO combination-generator feature that must be preserved.

Do not implement prediction or automatic recommendation logic as part of this MVP.

Core product flow:

```text
조합 만들기
↓
select exactly 6 numbers
↓
분석하기
↓
combination analysis result
↓
새로하기
```

The purpose is:

> Let the user manually select six Lotto 6/45 numbers and explore how those numbers and their sub-combinations behaved in historical draw data.

It is an analysis feature, not a prediction feature.

Avoid copy such as:

- 당첨 확률이 높습니다
- 좋은 번호입니다
- 추천 조합
- 유리한 조합
- 당첨 예상
- 예측 번호

Describe historical statistics only.

---

# 32. Combination Analysis — MVP Scope

MVP includes:

- manual selection of six numbers
- Lotto-ticket-inspired 1–45 selection UI
- analysis button
- historical prize-equivalent analysis
- historical main-number match distribution
- individual statistics for the six selected numbers
- combination-shape analysis
- pair through six-number sub-combination analysis
- selected-number-group frequency comparison
- existing period filter
- existing Bonus filter for eligible analytics
- `새로하기`

MVP does not include:

- editing a combination after analysis
- saved combinations
- analysis history
- favorites
- login
- persistence
- recommendation algorithms
- Monte Carlo
- automatic combination generation
- prediction
- AI-generated Lotto numbers

These may be considered later.

Do not implement them during MVP work.

---

# 33. Combination Analysis — Number Selection UX

Entering the `조합 만들기` tab should immediately show the number-selection experience.

Do not add a feature-selection menu for MVP.

Use numbers 1–45.

The layout should visually reference a real Lotto selection sheet while remaining consistent with the current app design.

Do not literally reproduce a paper Lotto slip.

The experience should feel:

- modern
- calm
- premium
- tactile
- immediately understandable

Rules:

- exactly six numbers must be selected
- selected numbers must be visually obvious
- show the current selected count, such as `4 / 6`
- before six numbers are selected, `분석하기` is disabled
- after the sixth number is selected, `분석하기` becomes enabled
- a seventh number cannot be selected
- do not use an alert popup merely to say that six numbers are required
- enforce the limit naturally through UI state
- selection order does not matter
- normalized output should be ascending numeric order

Touch targets should remain accessible and comfortable on mobile.

The selection screen is a primary product experience, not a utility form.

Make it visually polished.

---

# 34. Combination Analysis — Analysis Start

Analysis must not start automatically when the sixth number is selected.

The user explicitly confirms the selected combination with:

`분석하기`

This provides a clear commit point.

Do not navigate to the result screen automatically on the sixth tap.

---

# 35. Combination Analysis — New Analysis

The result experience must provide:

`새로하기`

MVP behavior:

```text
새로하기
↓
clear all six selected numbers
↓
return to the number-selection state
```

Do not preserve the old selection when starting a new analysis.

`수정하기` is not part of MVP.

Do not implement in-place editing of the analyzed six numbers yet.

---

# 36. Combination Analysis — Existing Filters

Reuse the existing period-filter UI and behavior where practical.

Supported analysis ranges are:

- 최근 3회
- 최근 5회
- 최근 10회
- 최근 52회
- 전체
- Custom

Custom uses the existing Custom-range implementation.

Do not invent a new Custom-range system if one already exists.

When the period changes, all period-dependent Combination Analysis results must reflect the selected range.

Always make the active analysis range clear to the user.

---

# 37. Combination Analysis — Bonus Filter

Reuse the existing Bonus filter UI and state behavior where practical.

However, there are two different bonus concepts.

They must never be confused.

## General analytics

For analytics that measure number appearance or co-occurrence:

- Bonus OFF → use only the six main winning numbers
- Bonus ON → include the historical bonus number according to the approved analytics definition

## Prize-rank evaluation

Prize-rank evaluation is independent of the Bonus analytics filter.

It must always use the historical bonus number where required by the actual Lotto 6/45 prize rule.

Example:

A draw where five selected numbers match main numbers and the sixth selected number matches that draw's bonus number is a second-prize-equivalent result even if the user currently has the Bonus analytics filter OFF.

Do not let the UI Bonus toggle change prize-rank history.

---

# 38. Combination Analysis — Filter Applicability

Use the following conceptual rules.

| Analysis | Period Filter | Bonus Analytics Filter |
|---|---|---|
| individual appearance count | yes | yes |
| individual appearance rank | yes | yes |
| selected-six average frequency | yes | yes |
| sub-combination frequency | yes | yes |
| sub-combination latest appearance | yes | yes |
| highest main-number match | yes | no |
| prize rank 1–5 | yes | no |
| main-number match distribution 0–6 | yes | no |

`Bonus Filter = no` in this table means:

the UI Bonus analytics toggle must not alter that metric.

It does not mean historical bonus data must be deleted or ignored where prize-rank evaluation requires it.

---

# 39. Combination Analysis — Prize Rules

Prize-equivalent history must follow the actual matching structure:

- 6 main-number matches → 1등
- 5 main-number matches + historical bonus match → 2등
- 5 main-number matches without bonus → 3등
- 4 main-number matches → 4등
- 3 main-number matches → 5등
- otherwise → no prize rank

There is no 6등.

Prize evaluation must not depend on the Bonus analytics UI filter.

The result may be described as historical prize-equivalent matching.

Do not imply that an actual ticket was purchased or won.

---

# 40. Combination Analysis — Match Distribution

Prize rank and raw main-number match count are different concepts.

Keep them separate in the domain model and UI.

For every draw in the selected period, calculate the count of matches against the six main winning numbers:

- 6 matches
- 5 matches
- 4 matches
- 3 matches
- 2 matches
- 1 match
- 0 matches

The match distribution ignores bonus-number matching.

Conceptually, internal data should preserve information such as:

```ts
type DrawCombinationMatch = {
  mainMatchCount: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  bonusMatched: boolean;
  prizeRank: 1 | 2 | 3 | 4 | 5 | null;
};
```

Exact type names may follow existing repository conventions.

Do not put this logic directly in React components.

---

# 41. Combination Analysis — Prize Result Summary

The result screen should give the user a fast summary before detailed statistics.

Important summary information includes:

- selected six numbers
- highest historical main-number match
- count of 1등-equivalent draws
- count of 2등-equivalent draws
- count of 3등-equivalent draws
- count of 4등-equivalent draws
- count of 5등-equivalent draws

Detailed qualifying historical draws should be accessible through a secondary interaction such as:

`전체 기록 보기`

For the detailed prize-history list, show qualifying draws with at least three main-number matches.

The summary should stay compact.

Do not show every matching draw directly on the primary result screen.

---

# 42. Combination Analysis — Individual Number Statistics

For each of the six selected numbers, provide useful period-dependent statistics.

MVP should include at minimum:

- appearance count
- appearance rank within 1–45

Use the active period and Bonus analytics filter.

If existing domain functions can safely provide additional already-defined statistics without complicating the MVP, they may be reused only when explicitly required by the task.

Do not modify the existing Explore screen just to support this summary.

---

# 43. Combination Analysis — Combination Shape

MVP includes simple structural analysis of the six selected numbers.

Show:

- odd / even ratio
- sum of six numbers
- consecutive-number groups

Examples:

```text
홀짝
3 : 3
```

```text
번호 합계
118
```

```text
연속 번호
12–13
```

Multiple consecutive groups may be shown separately.

Do not add additional shape metrics such as:

- low/high split
- decade bands
- ending-digit patterns
- custom scoring

unless explicitly requested later.

---

# 44. Combination Analysis — Sub-Combinations

From the selected six numbers, analyze every unordered sub-combination.

Calculate:

- 2-number combinations: 15
- 3-number combinations: 20
- 4-number combinations: 15
- 5-number combinations: 6
- 6-number combination: 1

Combination order has no meaning.

For example:

```text
3, 7, 12
```

and

```text
12, 3, 7
```

are the same combination.

Use canonical ascending-number order.

---

# 45. Combination Analysis — Sub-Combination Frequency

For each sub-combination, calculate how often all numbers in that combination appeared together during the active analysis period.

Bonus handling follows the Bonus analytics filter.

For each sub-combination, retain information needed for:

- appearance count
- latest appearance draw where applicable

The summary view should show up to TOP 3 for each combination size.

Detailed view should allow the user to see all combinations for that size.

Maximum list sizes are small:

```text
2 numbers → 15
3 numbers → 20
4 numbers → 15
5 numbers → 6
6 numbers → 1
```

No pagination is needed for these MVP lists.

---

# 46. Combination Analysis — Sub-Combination Sorting

Default sorting:

1. appearance count descending
2. latest appearance draw descending

When combinations have never appeared, do not misleadingly present zero-frequency combinations as meaningful `TOP` results.

Use a clear empty-state message where appropriate.

Example:

```text
과거 동일 조합 없음
```

For 2-number and 3-number analysis, low-frequency / least-frequent information may be considered later.

It is not required for MVP unless explicitly requested.

---

# 47. Combination Analysis — Group Frequency Comparison

Provide a simple comparison between the six selected numbers and the overall number population within the active analysis conditions.

MVP concept:

- average appearance count of the selected six numbers
- average appearance count across all 45 numbers
- percentage difference

Example:

```text
선택 6개 평균 출현
154.3회

전체 번호 평균
151.8회

전체 평균 대비
+1.6%
```

This is descriptive historical data only.

Do not classify the result as:

- good
- bad
- lucky
- favorable
- predictive

---

# 48. Combination Analysis — Progressive Disclosure

The result screen must prioritize hierarchy over information density.

Do not dump all available statistics onto one screen.

Preferred reading order:

```text
selected six numbers
↓
key summary
↓
historical prize result
↓
match distribution
↓
individual-number statistics
↓
combination shape
↓
sub-combination analysis
↓
group frequency comparison
```

Use compact summary blocks and secondary interactions such as:

- 전체 보기
- 전체 기록 보기
- 상세 보기

where appropriate.

A common pattern is:

```text
TOP 3
→ 전체 보기
```

Keep this interaction language consistent.

---

# 49. Combination Analysis — Visual Design

The Combination Analysis feature must feel like part of the same product as Explore.

Use the existing:

- dark background
- surface colors
- accent colors
- typography hierarchy
- border language
- spacing system
- card style
- interaction style

Do not create a separate design system.

The number-selection screen may visually reference a Lotto paper selection grid, but must be reinterpreted through the current premium dark UI.

Avoid:

- colorful Lotto-ball palettes
- paper-ticket imitation
- casino styling
- glossy balls
- rainbow numbering
- neon overload
- decorative gradients
- excessive shadows

Beauty should come from:

- spacing
- hierarchy
- typography
- subtle interaction feedback
- consistent geometry
- restrained accent color

---

# 50. Combination Analysis — Interaction Feedback

Interaction feedback should be subtle but clear.

Useful places for restrained feedback include:

- number selection
- number deselection during selection state
- sixth-number completion
- Analysis button activation
- filter change
- detail expansion/navigation

Do not use animation merely for decoration.

Animations should help the user understand state changes.

Use the project's existing animation approach.

Do not add another animation library.

Native haptics may be used sparingly if consistent with existing product behavior.

---

# 51. Combination Analysis — Empty and Edge States

Handle edge states intentionally.

Examples:

## Fewer than six selected

- Analysis button disabled
- no error modal needed

## Six already selected

- seventh number cannot be selected
- existing selected numbers remain intact

## No historical occurrence

Use descriptive copy such as:

```text
과거 동일 조합 없음
```

Do not show fake zero-value rankings.

## Very short Custom ranges

Analytics should still work correctly for the selected available draws.

Do not divide by zero.

## No qualifying prize-history draws

Show a calm empty state rather than an empty card or broken list.

---

# 52. Data

MVP uses static bundled data.

No runtime network request is required for core features.

Source of truth:

official Korean Lotto / 동행복권 historical draw data.

Generated runtime data should remain separate from raw input data.

Existing suggested structure:

```text
data/raw/lotto-draws.json
src/data/generated/metadata.json
src/data/generated/number-stats.json
src/data/generated/pair-counts.json
src/data/generated/trio-counts.json
```

Before implementing Combination Analysis:

1. inspect the actual repository
2. identify the real current raw and generated files
3. confirm whether historical main numbers and bonus numbers are available
4. confirm whether date/draw-range information is available
5. determine which new analytics can be calculated safely from existing data

Do not assume these exact paths exist.

Do not introduce SQLite for MVP.

Do not add a server just for Combination Analysis.

---

# 53. Runtime Calculation vs Generated Data

Do not precompute every possible six-number combination.

There are too many possible combinations and it is unnecessary for this feature.

Combination Analysis should calculate user-specific results from historical draw data or appropriate compact generated structures.

However:

- do not perform expensive global processing every render
- do not recalculate unchanged analytics unnecessarily
- do not put expensive analytics directly into JSX
- memoize or structure domain calculations appropriately
- preserve mobile responsiveness

If existing generated data can safely accelerate some metrics, reuse it.

Do not redesign the entire data pipeline unless required.

---

# 54. State Management

For MVP, prefer the existing state-management approach.

Use local React state where reasonable if that matches the current project.

Do not add Zustand, Redux, or another state library just for Combination Analysis.

Only consider broader persisted/global state if the product later adds features such as:

- saved combinations
- user settings
- history
- login
- persisted user state

These are not part of this MVP.

---

# 55. Performance Rules

Do not update React state every scroll frame.

Use Reanimated Shared Values for frame-level interaction where already appropriate.

React state should update only when meaningful application state changes.

Avoid heavy JS work during interaction.

Do not:

- run large analytics calculations every animation frame
- repeatedly parse JSON
- repeatedly rebuild unchanged combination matrices
- process all historical data unnecessarily after every render
- remount unrelated screens when filters change

For Combination Analysis:

- calculate after the user presses `분석하기`
- recalculate affected analytics when analysis filters change
- reuse derived results where practical

Target smooth interaction.

---

# 56. Accessibility

Maintain:

- touch targets >= 44pt where applicable
- readable contrast
- text/status in addition to color
- accessible selected-number labels
- accessible selected-count feedback
- reduced-motion considerations

Do not rely solely on accent color to indicate selected numbers.

Decorative layers should not pollute the accessibility tree.

---

# 57. Scope Discipline

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

For Combination Analysis work specifically:

- do not modify Explore unless required for safe shared-component reuse
- do not change NumberScrubber behavior
- do not change HOT/COLD definitions
- do not change Pair/Trio definitions
- do not introduce prediction
- do not implement deferred features

---

# 58. Codex Working Style

When receiving a task:

1. inspect the relevant files first
2. understand current implementation
3. identify the smallest safe patch
4. reuse existing components and patterns
5. modify only required files
6. do not rewrite working architecture
7. do not continue into unrelated improvements
8. stop once the requested scope is complete

For a larger new feature such as Combination Analysis:

1. inspect navigation and current `조합 만들기` placeholder
2. inspect theme/design-system usage
3. inspect the existing period filter
4. inspect the existing Bonus filter
5. inspect Lotto raw/generated data
6. inspect existing analytics/domain functions
7. identify reusable pieces
8. design the smallest architecture extension
9. implement the feature without rewriting Explore
10. validate the affected paths

Do not perform broad repository refactors unless explicitly requested.

---

# 59. Existing Component Reuse

Before creating new UI or domain infrastructure, check whether the project already contains suitable:

- period-filter components
- Bonus filter controls
- cards
- typography components
- number chips
- buttons
- section headers
- list rows
- spacing tokens
- color tokens
- navigation helpers
- domain utilities

Reuse them when doing so preserves their existing behavior.

Do not duplicate an existing component merely because a new screen is being created.

But also do not force reuse if it makes the UX worse or requires changing a stable existing component in risky ways.

---

# 60. Validation Strategy

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
- relevant analytics tests
- requested platform validation

For Combination Analysis domain logic, targeted tests should cover at minimum where practical:

- 1등 classification
- 2등 classification using bonus
- 3등 classification
- 4등 classification
- 5등 classification
- Bonus UI filter not affecting prize rank
- match distribution
- period filtering
- sub-combination counts
- sub-combination sorting
- six-number selection limit

Never claim a test or platform was checked if it was not actually run.

---

# 61. Iteration Speed

This project is in active UI/interaction iteration.

Optimize for:

**small patch → preview → user review → next patch**

rather than:

**large rewrite → full validation → unrelated cleanup**

For major features, implementation may be split into clear phases, but do not over-engineer future phases.

Keep interactive design iteration fast.

---

# 62. No Unrequested Cleanup

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

# 63. Dependencies

Before adding a new package:

1. confirm the current stack cannot reasonably implement the requested behavior
2. explain why the dependency is needed
3. avoid adding it if the change can be done cleanly with existing dependencies

For Combination Analysis, default to no new dependency.

The existing stack should be sufficient unless the repository proves otherwise.

---

# 64. Comments and Documentation

Keep code understandable.

Add comments only where behavior is non-obvious, especially:

- scroll physics
- velocity clamping
- rail deformation math
- interpolation logic
- prize-rank classification
- Bonus-filter separation
- sub-combination counting
- analytics normalization

Do not over-comment straightforward JSX or styling.

---

# 65. Definition of Done for Small UI Tasks

A small UI task is done when:

- the requested change is implemented
- existing interaction architecture still works
- obvious TypeScript errors are absent
- no unrelated features were changed
- no unnecessary dependency was added

Then stop.

Do not continue developing additional features.

---

# 66. Definition of Done for Combination Analysis MVP

Combination Analysis MVP is complete when:

- `조합 만들기` no longer shows the placeholder
- users can select exactly six numbers from 1–45
- the selection UI is polished and consistent with the existing app
- Analysis starts only after pressing `분석하기`
- active analysis range is clear
- existing period filtering works
- existing Bonus analytics filtering is reused where applicable
- prize-rank analysis uses historical bonus independently of the Bonus analytics toggle
- 1등 through 5등-equivalent historical counts are correct
- 0–6 main-number match distribution is correct
- individual selected-number counts/ranks work
- odd/even, sum, and consecutive-number analysis works
- 2–6-number sub-combinations are analyzed
- TOP 3 summaries work
- full sub-combination lists can be viewed as required
- sorting rules are correct
- zero-occurrence states are handled cleanly
- selected-six average vs overall average works
- `새로하기` clears the combination and returns to selection
- Explore remains functionally unchanged
- no prediction/recommendation feature was added
- no unnecessary dependency was added
- relevant TypeScript and analytics validation passes

---

# 67. Current Product Priority

The existing Explore / NumberScrubber experience should remain stable.

The current new-feature priority is:

**Combination Analysis in `조합 만들기`.**

This does not mean Explore should be redesigned.

The intended Combination Analysis experience is:

```text
open 조합 만들기
↓
see a polished Lotto-inspired 1–45 selector
↓
select six numbers
↓
press 분석하기
↓
immediately understand the strongest historical result
↓
explore deeper statistics progressively
↓
start over cleanly with 새로하기
```

The user should feel that analyzing a six-number combination is:

- intuitive
- beautiful
- responsive
- informative
- enjoyable to explore

not that the app is trying to predict Lotto results.

---

# 68. Final Product Principle

Whenever there is a tradeoff between:

- more visual effects
- better clarity
- smoother interaction

prefer:

1. clarity
2. smooth interaction
3. restrained visual delight

Do not sacrifice usability for decorative animation.

For all analytics:

> historical data should be presented as historical data.

Do not turn descriptive statistics into claims about future winning probability.

---

# 69. Release Versioning and Change History

The first public app version is `1.0.0` and uses patch increments for each remote push that contains new product changes:

```text
1.0.0
1.0.1
1.0.2
...
```

Before pushing new changes to the remote Git repository:

1. increment the patch version exactly once
2. keep `app.json`, `package.json`, and the root package entries in `package-lock.json` synchronized
3. add the new version at the beginning of `src/features/settings/releaseNotes.ts`
4. summarize every user-visible change as `screen` plus a specific Korean `summary`
5. include all changes from that push in the release note

Do not push new product changes without both the version bump and matching release-note entry.

The in-app release-note list and direct route must remain visible to every user without an account or UID restriction.
