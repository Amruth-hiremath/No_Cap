# NO CAP v0.1 - MASTER REPAIR, REDESIGN & IMPLEMENTATION PROMPT

You are working on an existing application called **NO CAP**.

NO CAP is a personal system-design learning workbench:

> **Design it. Break it. Scale it.**

The goal is NOT to build a generic study dashboard.

The goal is to build a premium, genuinely useful **system-design learning environment** that turns:

**learn → visualize → reason → practice → recall → apply**

into a repeatable loop.

You have been given the existing repository:

`nocap-v0.1.zip`

The repository already contains:

* the current Next.js implementation
* the current content
* the Cloudflare Worker scaffold
* the v2.1 project specifications inside `/specs`
* the current design tokens and component system

Do NOT throw away the repository and generate a new toy app.

You must inspect, repair, restructure and substantially improve the existing implementation.

---

# 1. SOURCE OF TRUTH

The repository contains five authoritative product documents:

```text
/specs/NO_CAP_PRD.pdf
/specs/NO_CAP_TRD.pdf
/specs/NO_CAP_UI_Specification.pdf
/specs/NO_CAP_User_Flow.pdf
/specs/NO_CAP_Backend_Blueprint.pdf
```

Read all five before making architectural or UX decisions.

They represent the approved **NO CAP v2.1 architecture and product vision**.

However, there is an important release distinction:

## NO CAP v0.1 = THE LEARNING ENGINE

v0.1 must implement:

* Home / Today
* Roadmap
* Concept Library
* Concept Lessons
* Daily Dose
* Diagrams / visual explanations
* Quiz engine
* Review / spaced repetition
* Progress / mastery
* Glossary
* Focus Mode
* PWA
* basic personal state persistence

v0.5 is the later Design Gym:

* Interactive Labs
* Architecture Playground
* Case Studies
* Interview Mode
* Projects

v1.0:

* Notes
* Collections
* Cost Calculator
* Career Path
* Code Walkthrough
* Export / Share
* Real-world teardowns

v2.0:

* Collaboration
* Voice
* AI Mentor
* calendar/integrations

Future:

* remote code execution
* live cloud pricing
* native mobile
* multi-user/cohort infrastructure

DO NOT implement future versions just because placeholders exist in the repository.

However, v0.1 must be a **complete and polished learning product**, not a collection of placeholder cards saying “coming in v0.5”.

---

# 2. CURRENT IMPLEMENTATION IS NOT ACCEPTABLE AS-IS

The current implementation is only a rough prototype.

It has several classes of problems:

### A. Functional bugs

### B. Incorrect state architecture

### C. Hardcoded/fake data

### D. Incomplete content rendering

### E. Weak learning flow

### F. Poor visual hierarchy

### G. Excessive glass-card usage

### H. Future-feature placeholders polluting the current UX

### I. Content architecture that does not scale

### J. Several buttons/actions that do nothing

Your job is to fix ALL of these.

Do not merely polish the existing layout.

---

# 3. FIRST TASK: AUDIT THE EXISTING REPOSITORY

Before changing code, inspect:

```text
src/
content/
worker/
public/
specs/
package.json
next.config.js
README.md
```

Build a mental model of:

* routing
* state
* content loading
* mastery calculations
* review scheduling
* component hierarchy
* CSS tokens
* PWA behavior
* Worker scaffold
* content schema
* current data coverage

Do not assume the README is correct.

The actual code is the authority for current implementation state.

After inspection, create an internal implementation checklist based on:

```text
SPEC REQUIREMENT
    ↓
CURRENT IMPLEMENTATION
    ↓
STATUS
    ↓
REQUIRED CHANGE
```

Do not stop after producing the audit.

Actually implement the fixes.

---

# 4. CRITICAL BUGS TO FIX

These are known problems in the current implementation.

## 4.1 CRITICAL: state updates during render

Current `src/app/concepts/[slug]/concept-view.tsx` contains calls equivalent to:

```tsx
setLastVisited(concept.slug, 0);
markExposed(concept.slug);
```

inside the component render body.

THIS MUST BE FIXED.

Never perform Zustand state mutations during render.

Use `useEffect` or another appropriate lifecycle mechanism.

The behavior should be:

* opening a concept records the visit exactly once
* entering a concept records exposure exactly once
* scrolling updates last-visited position without causing render loops
* reopening the same concept should not repeatedly create state mutations

Do not hack around the issue.

Fix the state lifecycle properly.

---

# 5. FIX MASTERY SEMANTICS

The current implementation has a semantic mismatch:

The button says:

> Mark understood

but calls:

```ts
markExposed()
```

That is wrong.

The mastery lifecycle is:

```text
Not Started
↓
Exposed
↓
Understood
↓
Practiced
↓
Applied
↓
Review Due
↓
Mastered
```

v0.1 uses the five dimensions:

```text
Learn
Recall
Apply
Explain
Interview
```

Implement the semantics correctly.

Actions should not lie about what they do.

For example:

```text
Start concept
→ Exposed

Mark understood
→ Understood

Complete quiz
→ Recall / Practice signal

Complete scenario
→ Apply signal

Explain concept
→ Explain signal

Interview interaction
→ Interview signal
```

Do NOT let a simple page visit magically mark a concept as mastered.

Make the model explainable.

---

# 6. FIX ALL NO-OP ACTIONS

Audit every button/link/control in the application.

No control may visually imply functionality while doing nothing.

Known examples:

### "Add to review"

Currently effectively no-op.

Implement it.

### "Add to collection"

Since collections are v1.0, do NOT make it look active.

Use a proper disabled/deferred treatment OR remove the action from v0.1.

Do not present fake functionality.

### "Sign in with GitHub"

Current button is effectively a placeholder.

Because v0.1 can run locally without backend auth:

Use one of:

* proper auth flow if you are actually wiring it now
* clearly label it as unavailable in local mode

Never make a button that looks functional but does nothing.

### Voice mode

Do not show it in v0.1.

### Cost calculator

Do not show it in v0.1.

### Labs

Do not show fake working pages in v0.1.

### Playground

Do not show fake working pages in v0.1.

Deferred functionality must be represented by the product strategy, not by dead UI.

---

# 7. REMOVE FUTURE-FEATURE CLUTTER FROM THE SIDEBAR

The current sidebar shows:

```text
Tier B/C later
Labs
Playground
Case Studies
Interview
Voice
```

This makes the application feel unfinished.

For v0.1, the navigation should contain only things that actually exist.

Use a clean navigation model around:

```text
Today
Roadmap
Learn
Practice
Review
Progress
Glossary
```

You may rename/reorganize these where appropriate.

Important:

"Practice" in v0.1 should refer to the actual quiz/recall/practice experience.

Do not make Practice a page full of four disabled cards saying things will arrive later.

The user should immediately feel:

> “This is a complete product I can use today.”

---

# 8. REDESIGN THE VISUAL LANGUAGE

The current implementation looks too much like:

> generic glassmorphism dashboard

That is NOT the target.

The approved visual direction is:

# Studio Cockpit

A serious engineering environment with a chill builder personality.

Think:

* Linear
* Raycast
* Arc
* modern technical documentation
* premium developer tools
* subtle editorial influence

Not:

* SaaS admin dashboard
* AI landing page
* glassmorphism template
* excessive rounded cards
* purple/pink gradients
* giant hero gradients
* decorative blobs
* generic "AI education" aesthetics

NO gradients.

NO pink-purple-blue AI slop.

NO giant decorative illustrations.

NO excessive glow.

NO every-component-is-a-card design.

---

# 9. REDUCE GLASSMORPHISM

The specification permits glass, but the current implementation overuses it.

Glass should communicate hierarchy.

Use:

### Liquid Glass

Only for:

* Today's Dose hero
* highly focused/high-priority surfaces

Maximum roughly 1 major liquid-glass surface per screen.

### Frosted Glass

Use sparingly for:

* compact supporting panels
* interactive control groups
* small dashboard cards

### Solid surfaces

Use for:

* long-form lessons
* serious reading
* diagrams
* tables
* code
* dense educational material
* content blocks

The lesson page must NOT look like:

```text
card
card
card
card
card
card
```

Instead it should feel like a structured technical article with clear sections and occasional interactive surfaces.

---

# 10. TYPOGRAPHY NEEDS A MAJOR CORRECTION

The current use of:

```text
Noto Serif SC
```

for basically the entire UI is not appropriate for this product.

The app is an engineering learning platform.

Use a modern readable sans-serif for the interface and body.

Examples:

* Inter
* Geist
* system-ui

Use a restrained mono font for:

* metrics
* code
* architecture labels
* shortcuts
* technical values

A serif can be used VERY selectively for editorial emphasis, but it must not dominate the application.

Typography hierarchy should feel like a serious developer product.

---

# 11. FIX THE COLOR SYSTEM IMPLEMENTATION

The CSS defines custom tokens such as:

```text
accent
accent-2
accent-3
paper
border
ink
```

but the application uses many classes such as:

```text
bg-forest-50
bg-amber-50
bg-rust-50
bg-red-50
bg-teal-50
```

without consistently defining those color tokens.

Do a complete CSS/token audit.

Every custom utility used in JSX must actually exist.

Do not rely on undefined Tailwind utility names.

Create a coherent token system.

For example:

```text
surface
surface-elevated
surface-subtle
border
border-strong

text-primary
text-secondary
text-muted

accent
accent-soft

success
success-soft

warning
warning-soft

danger
danger-soft
```

Use semantic naming rather than random one-off color classes.

---

# 12. THE APP SHOULD LOOK GOOD BEFORE ANY DATA EXISTS

Design empty states deliberately.

Examples:

### No review due

Instead of a giant empty dashboard:

```text
You're clear.

Nothing needs review right now.

Next up
→ Continue today's dose
```

### No progress

```text
Your mastery map starts here.

Complete your first concept to light it up.
```

### Search empty

Useful, compact explanation.

### First launch

Beautiful but minimal.

Avoid empty grids and dead space.

---

# 13. HOME / TODAY MUST BECOME THE ACTUAL CORE EXPERIENCE

Current Home is just a collection of dashboard cards.

That is not enough.

Home must answer the three product questions:

```text
What should I do now?
Why is it useful?
What happens after this?
```

Structure:

```text
TODAY

Today's Dose
12 min
Concept title
One-line reason

[ Start today's dose ]

---------------------------------

Review due
X concepts
[ Review now ]

---------------------------------

Continue
Concept + exact lesson position

---------------------------------

Your progress
Current phase
X / Y concepts

---------------------------------

One smart recommendation
Based on weakest meaningful signal

---------------------------------

Weekly momentum
7 day activity
```

Do not use hardcoded statistics.

Every number must come from actual store state and content.

---

# 14. IMPLEMENT A REAL DAILY DOSE EXPERIENCE

The PRD says Daily Dose is the heart of the product.

Current Home does not actually provide the Daily Dose flow.

Implement it.

Route:

```text
/daily
```

or another clean equivalent.

The session should have:

```text
Today's Concept
↓
01 Mental Model
↓
02 Visual
↓
03 Interactive / Prediction
↓
04 Quiz
↓
05 Recall
↓
Complete
```

The screen should visually communicate:

* duration
* current step
* completed steps
* locked future steps
* progress
* focus mode

Use a compact stepper/progress rail.

Do not make this a boring vertical checklist.

It should feel like a guided session.

---

# 15. DAILY DOSE MUST BE DATA-DRIVEN

Create a proper daily-session model.

It should derive:

```text
new concept
review concept
visual
quiz
scenario/prediction
recall
```

from the actual content and user state.

Do not hardcode:

```ts
cap-theorem
```

as today's concept.

Do not use:

```ts
[40, 20, 10, 0]
```

for roadmap progress.

Do not use fake "weak area" text.

---

# 16. CONCEPT LIBRARY NEEDS A PREMIUM REDESIGN

Current cards are too generic.

Create a stronger library experience:

Top:

```text
Concepts

Build the mental models behind real systems.

[ Search ]
[ All areas ]
[ Difficulty ]
[ Mastery ]
```

Then a visually strong but restrained collection view.

Each concept item should show:

* title
* area
* phase
* duration
* difficulty
* mastery
* prerequisite indicator
* small conceptual summary

Avoid cards that all look identical.

Use hierarchy.

---

# 17. CONCEPT PAGE IS THE MOST IMPORTANT SCREEN

The current concept page is one long stack of generic cards.

Redesign it into a real educational reading experience.

Structure:

```text
← Learn

CACHE ASIDE
12 min · Core · Caching

Why this matters
One-sentence mental model

[Prerequisites] [Related] [Used in]

---------------------------------

WHY IT EXISTS

Deep explanation...

---------------------------------

MENTAL MODEL

Visual explanation

---------------------------------

HOW IT WORKS

Step-by-step explanation

---------------------------------

TRY THIS

Prediction / interaction

---------------------------------

TRADE-OFFS

Advantages / costs

---------------------------------

FAILURE MODES

Cache stampede
Stale data
...

---------------------------------

CHECK YOURSELF

Interactive question

---------------------------------

COMMON MISTAKES

...

---------------------------------

WHERE YOU SEE IT

...

---------------------------------

What next?
```

The page should feel like a high-quality technical learning article.

---

# 18. FIX LESSON BLOCK RENDERING

The type system supports:

```text
prose
diagram
flow
table
code
quiz
simulation
scenario
callout
```

but `LessonRenderer.tsx` currently handles only a subset.

This is an architectural mismatch.

Implement the renderer system properly.

At minimum v0.1 must support:

```text
prose
diagram
flow
table
code
quiz
scenario
callout
```

Simulation can remain a future-ready block type if its actual engine belongs to v0.5, but the rendering architecture should be designed to support it cleanly.

Do not silently `return null` for supported content types.

---

# 19. DIAGRAMS MUST ACTUALLY LOOK LIKE DIAGRAMS

Current content uses ASCII diagrams inside `<pre>` blocks.

That is useful as a fallback, but NOT sufficient for the visual quality target.

Build a reusable diagram renderer.

For v0.1, you can use:

* CSS/SVG
* semantic node/edge structures
* simple client-side diagram components

Do not introduce a huge dependency unless necessary.

The output should support:

```text
Client
   ↓
DNS
   ↓
Load Balancer
   ↓
App Servers
   ↓
Cache
   ↓
Database
```

with clear nodes, arrows, labels and grouping.

The fallback ASCII version may remain accessible via a "Text view" or accessibility description.

---

# 20. CONTENT SYSTEM MUST SCALE

Current `content.ts` manually imports:

```text
howInternetWorks
dns
loadBalancing
caching
capTheorem
```

This does not scale.

The content loader needs a registry/discovery strategy appropriate for Next.js static content.

Adding:

```text
content/concepts/sharding.json
```

should NOT require manually editing a giant import list.

Create a maintainable content registry.

Also:

* validate content
* validate prerequisites
* validate related links
* detect missing concept references
* detect duplicate slugs
* detect unsupported block types
* detect missing required fields

A build-time content validation script is strongly recommended.

Example:

```text
npm run content:validate
```

---

# 21. THE CURRENT CONTENT IS FAR TOO SHALLOW FOR THE PRODUCT PROMISE

Current v0.1 contains only 5 concepts.

That is acceptable as seed/demo content, BUT:

the content schema and UI must make it clear these are seed concepts, not the completed curriculum.

The PRD says a concept is publish-ready only when it has:

* concise summary
* deep explanation
* problem
* mechanism
* trade-offs
* failure modes
* visual
* interactive/prediction activity
* at least five assessments
* at least two real-system mappings
* prerequisites
* related concepts
* interview prompts
* common misconceptions
* review metadata

The current concepts often contain only 1-2 quiz items and no true interactive/prediction step.

For this iteration:

1. improve the content schema to support all required fields
2. improve the existing five seed concepts significantly
3. do not invent hundreds of fake concepts
4. make the architecture ready for expanding the curriculum

The seed concepts should feel genuinely high quality.

---

# 22. QUIZ ENGINE NEEDS TO BE MORE THAN ONE MCQ CARD

v0.1 should support at least these assessment shapes architecturally:

```text
multiple choice
multi-select
prediction
scenario
ordering
```

You do NOT need hundreds of them immediately.

But the content schema and engine should not force the entire product into one MCQ shape.

At minimum, improve the existing MCQ experience:

* selectable answer state
* clear submit/reveal state
* strong explanation
* why the answer is correct
* why alternatives are wrong where useful
* score signal
* mastery update
* review scheduling
* retry behavior
* completion tracking

Avoid the generic:

> Yep. That's the trade-off.

Copy.

Make feedback educational.

---

# 23. REVIEW IS CURRENTLY TOO WEAK

The review page currently displays the question and then merely shows the options as static text.

That's not proper retrieval practice.

Make review interactive.

Flow:

```text
Question

[ A ]
[ B ]
[ C ]
[ D ]

[ Reveal ]

↓ answer

Correct / Incorrect
Why

Confidence:
Forgot
Hard
Good
Easy

Next review:
1 day → 3 days → 7 days
```

Do not let the learner see the answer choices as passive text before interacting if the intended review mode requires recall.

Fix the display of:

```text
Next review in X days
(was: Y days)
```

Currently the implementation displays the same value for both.

Capture the prior interval before scheduling the new review.

---

# 24. FIX REVIEW STATE UPDATES

When completing the final review card:

the current implementation can reset the index while `dueReviews` is derived from state.

Make the flow robust.

After review:

* remove it from the due queue
* show completion state if all reviews are done
* do not flash stale cards
* do not replay already-completed reviews
* correctly update mastery
* correctly update streak
* correctly schedule next review

---

# 25. STREAK LOGIC NEEDS TO BE SAFER

Current streak logic uses:

```ts
new Date().toISOString()
```

which is UTC-based.

The product model has a timezone.

Use the user's configured timezone for day boundaries.

Do not make a user in India lose a streak at midnight UTC.

Also ensure first activity transitions:

```text
0 → 1
```

correctly.

Missed days should recover gracefully according to the product spec.

---

# 26. LAST VISITED POSITION MUST ACTUALLY WORK

The UI specification requires:

> Continue where you left off

including exact lesson scroll position.

Current implementation always calls:

```text
setLastVisited(..., 0)
```

This defeats the purpose.

Implement:

* scroll position tracking
* debounced persistence
* restore on mount
* safe restoration after content renders
* no excessive writes

Do not update state on every pixel.

Use a debounce/throttle.

---

# 27. FOCUS MODE IS INCOMPLETE

The current app says:

> Exit focus mode (Esc)

but the escape-key behavior is not properly implemented in the app shell.

Implement:

* Escape exits focus mode
* focus state is consistent
* a proper Pomodoro timer exists
* 5 / 12 / 25 minute options
* timer survives normal component re-renders
* no distracting UI
* focus mode works on Daily Dose and concept learning

Do not just hide the sidebar.

It must actually feel like a focus environment.

---

# 28. THEME SETTING IS CURRENTLY BROKEN

The Zustand `theme` state exists:

```text
system
light
dark
```

but CSS is driven primarily by:

```css
@media (prefers-color-scheme: dark)
```

Changing the setting therefore does not correctly control appearance.

Implement explicit theme application:

```text
data-theme="light"
data-theme="dark"
```

with system fallback.

Avoid hydration flash where practical.

Make the setting actually work.

---

# 29. PWA / OFFLINE BEHAVIOR

Core content must remain usable without network connectivity.

Do not make core learning dependent on:

* Google Fonts
* an AI API
* cloud API calls
* worker availability

The current app links external Google Fonts directly.

Do not make external font fetching part of the critical path.

Prefer system fonts / bundled font strategy.

Core pages should work when:

```text
network = offline
worker = unavailable
AI = unavailable
```

The user should still be able to:

* open lessons
* navigate roadmap
* read diagrams
* take quizzes
* review locally
* see progress locally

---

# 30. SYSTEM HEALTH MUST NOT BE FAKE

Current Settings shows:

```text
Worker requests: 0
D1 rows: 0
R2: 0
AI neurons: 0
```

This is misleading if the Worker isn't wired.

Do one of:

### local mode

Show:

> Local mode
> Cloud sync is not connected.

### production mode

Show actual quota data.

Never display fake zeros as if they are live metrics.

---

# 31. AUTH MUST BE CLEARLY SEPARATED FROM LOCAL MODE

The application should support:

### Local Mode

Works with:

* localStorage
* no backend
* no login

### Synced Mode

Uses:

* GitHub auth
* Worker
* D1

The UI should explain this.

Do not make users feel that authentication is required to use NO CAP if it isn't.

---

# 32. PROGRESS PAGE MUST BECOME ACTUAL LEARNING ANALYTICS

Current progress is too dashboard-like and too shallow.

Implement useful signals:

## Mastery by area

```text
Fundamentals       72%
Scaling            43%
Caching            80%
Distributed Sys.   31%
```

## Mastery matrix

```text
Concept          Learn Recall Apply Explain Interview
CAP              ████  ███   ██    ███     █
Caching          ████  ████  ███   ██      █
DNS              ███   ███   █     ██      █
```

## Weak areas

Generated from actual attempts.

## Review load

```text
Due today
Due this week
Mastered
```

## Momentum

Actual seven-day activity.

Do not create fake arrays.

---

# 33. ROADMAP MUST FEEL LIKE A MAP

Current roadmap is a list of phase cards.

The specification specifically says:

> The roadmap is a map, not a checklist.

Improve the four modes.

## Guided

Show:

```text
Current concept
↓
Why next
↓
Prerequisite
↓
Recommended next
```

## Explore

Create a dependency graph using lightweight SVG/CSS.

Nodes:

```text
DNS
HTTP
Load Balancing
Caching
CAP
```

Edges show relationships.

## Mastery

Show concept states visually.

## Interview

Filter to interview-relevant concepts.

No fake career view in v0.1.

---

# 34. DO NOT OVER-BUILD THE ROADMAP

Do not add a huge graph library just to make a flashy network.

Use lightweight SVG / CSS unless there is an actual need for a graph dependency.

The graph should communicate knowledge structure, not become a visual gimmick.

---

# 35. PRACTICE PAGE SHOULD BE REFRAMED FOR V0.1

The current Practice page is mostly:

> “These features are coming later.”

That's not acceptable.

For v0.1, Practice should be the home for:

* quizzes
* scenario questions
* recall
* concept checks
* weak-area drills

The future labs can appear in the product roadmap elsewhere, but don't make Practice an empty store window.

---

# 36. GLOSSARY SHOULD BE CONNECTED TO THE LEARNING GRAPH

Current glossary is a basic list.

Improve it so each term can show:

* definition
* aliases
* linked concept
* related concepts
* phase
* quick action "Learn this"

Search should be instant.

---

# 37. COMMAND PALETTE SHOULD FEEL LIKE A REAL COMMAND PALETTE

Current search is acceptable structurally but basic.

Improve:

```text
⌘K

Search concepts, glossary, roadmap...

Recent
Suggested
Concepts
Glossary
Actions
```

Support keyboard navigation:

* Arrow up/down
* Enter
* Escape

Search should not only search titles.

Use:

* title
* aliases
* area
* phase
* glossary definitions
* relevant metadata

Keep it client-side.

---

# 38. RESPONSIVE DESIGN

Desktop is the primary experience.

Tablet:

* compact sidebar/icon rail

Mobile:

* read/review focused
* bottom navigation
* no huge desktop canvas assumptions

Do not simply shrink the desktop layout.

Make mobile intentionally designed.

At mobile width:

```text
Today
Roadmap
Practice
Review
More
```

Use a proper bottom navigation bar.

---

# 39. ACCESSIBILITY

Implement:

* semantic buttons
* proper labels
* keyboard interaction
* focus-visible states
* readable contrast
* reduced motion
* diagram text alternatives
* interactive graph keyboard fallback
* no meaning conveyed by color alone

Never make a core learning action mouse-only.

---

# 40. ANIMATION

Animation should communicate causality.

Use subtle motion for:

* page entry
* card transitions
* mastery changes
* quiz feedback
* graph expansion
* progress completion

Do NOT animate everything.

No exaggerated:

* glow pulses
* floating blobs
* constant shimmer
* parallax
* bouncing UI

The product should feel calm and intelligent.

---

# 41. CONTENT VOICE

NO CAP should sound:

* technically sharp
* concise
* curious
* slightly playful
* engineering-oriented
* confident

Avoid:

* corporate training language
* generic AI language
* overused startup wording
* childish gamification
* fake hype

Example:

Bad:

> "Amazing! You've unlocked an incredible new learning adventure!"

Better:

> "Locked in. You can now explain why CAP matters."

---

# 42. CONTENT SHOULD TEACH THROUGH PROBLEMS

Concept lessons should repeatedly use:

```text
Problem
↓
Naive solution
↓
Why it breaks
↓
Pattern
↓
Trade-off
↓
Failure mode
↓
Real system
```

Example for caching:

```text
Every request hits DB
↓
DB becomes bottleneck
↓
Cache hot data
↓
Now stale data becomes possible
↓
Choose invalidation strategy
```

This is how NO CAP should differentiate itself from ordinary notes.

---

# 43. DO NOT TURN THE APP INTO A DOCUMENT READER

The current implementation feels too close to:

> cards containing text

The product must feel interactive.

Even in v0.1:

* structured sections
* diagrams
* concept relationships
* quizzes
* prediction
* recall
* mastery
* guided Daily Dose

must be visually and behaviorally integrated.

---

# 44. HOME SHOULD NOT BE CRAMMED WITH METRICS

The current Home has multiple small cards.

Reduce information density.

Primary hierarchy:

```text
TODAY'S DOSE
       ↓
REVIEW
       ↓
CONTINUE
       ↓
PROGRESS / RECOMMENDATION
```

Do not make the user read five dashboards before learning.

---

# 45. CURRENT CONTENT SHOULD FEEL COHERENT

The five seed concepts:

```text
How the Internet Works
DNS
Load Balancing
Caching
CAP Theorem
```

should form a logical learning chain.

Use prerequisites:

```text
Internet
   ↓
DNS
   ↓
Load Balancing
   ↓
Caching
   ↓
CAP / distributed systems
```

The roadmap, recommendations and Daily Dose should respect these relationships.

---

# 46. FIX CONTENT REFERENCES

The tracks reference concept slugs.

Validate every referenced concept.

No broken concept cards.

No phase with invisible concepts.

No "N concepts" count that includes missing concepts.

The content validator should fail the build for broken references.

---

# 47. KEEP THE BACKEND LIGHT

Do NOT replace the architecture.

Approved architecture:

```text
Next.js
TypeScript
Tailwind
PWA

↓ optional sync

FastAPI on Cloudflare Python Worker
Cloudflare D1
Cloudflare R2
Durable Objects later
Queues/Cron only when necessary
Workers AI optional
```

Do NOT add:

* PostgreSQL
* Redis
* Firebase
* Supabase
* Docker
* Kubernetes
* Celery
* external search
* paid AI APIs
* external CMS

The app is designed to be zero-cost.

---

# 48. DO NOT WIRE CLOUD SERVICES JUST FOR SHOW

v0.1 should work locally.

Do not introduce cloud calls for:

* reading static content
* running simulations
* computing mastery
* quizzes
* roadmap rendering

All deterministic learning logic should stay client-side whenever possible.

---

# 49. WORKER CODE MUST REMAIN THIN

No heavyweight Python dependencies.

Do not introduce:

* NumPy
* Pandas
* SciPy
* ML frameworks
* native binaries

The Worker is for:

* authentication
* sync
* mutations
* quota data
* future optional integrations

not heavy computation.

---

# 50. ZERO-COST REQUIREMENT

The deployed app must not require:

* paid subscription
* trial credit
* credit card
* paid API
* accidental billing

When optional quota is exhausted:

```text
optional feature unavailable
↓
deterministic fallback
↓
core product still works
```

Do NOT state that free quotas are infinite.

The real product promise is:

> No paid dependency. No accidental billing. Core learning remains usable.

---

# 51. TEST THE APP PROPERLY

You must run:

```bash
npm install
npm run type-check
npm run build
```

Fix ALL errors.

Do not stop because the existing repository already had errors.

Also add/run useful content validation.

Test:

### Navigation

* Today
* Roadmap
* Concepts
* Concept detail
* Practice
* Review
* Progress
* Glossary
* Settings

### State

* first visit
* concept exposure
* quiz
* review
* mastery
* streak
* theme
* focus mode
* persistence

### Responsive

* desktop
* tablet
* mobile

### PWA

* manifest
* service worker
* offline core page access where possible

---

# 52. MANUALLY TEST CRITICAL USER FLOWS

At minimum verify:

## Flow 1

First launch → Today

## Flow 2

Today → Daily Dose → concept → quiz → complete

## Flow 3

Concept → mark understood → progress updates

## Flow 4

Quiz → review scheduled → Review page

## Flow 5

Review → answer → next review date changes

## Flow 6

Roadmap → concept → lesson → back

## Flow 7

Theme system → light → dark

## Flow 8

Focus mode → timer → Escape → exit

## Flow 9

Search → result → open concept → Escape closes palette

## Flow 10

Refresh page → state persists

---

# 53. VISUAL QA IS REQUIRED

Do not judge the implementation only from code.

Run the app and inspect the actual UI.

Check:

### Desktop 1440px

* shell balance
* sidebar width
* content width
* hero hierarchy
* typography
* whitespace

### Tablet

* navigation behavior
* card layout

### Mobile ~390px

* bottom navigation
* readable text
* no horizontal overflow
* no cramped buttons

Fix:

* clipping
* overflow
* weird card heights
* giant whitespace
* inconsistent spacing
* broken icons
* bad contrast
* hover states that do nothing
* layout jumps

---

# 54. DO NOT USE PLACEHOLDER COPY TO HIDE MISSING FEATURES

Never write:

> More coming soon...

everywhere.

For v0.1, make the shipped scope feel complete.

Deferred roadmap can be shown subtly from:

```text
Settings / About / Future roadmap
```

but must not dominate the interface.

---

# 55. COMPONENT ARCHITECTURE

Refactor where useful.

Recommended conceptual structure:

```text
components/
  shell/
  navigation/
  learning/
    DailyDose
    Lesson
    LessonSection
    Quiz
    Scenario
    Recall
  roadmap/
    RoadmapGraph
    PhaseNode
    MasteryView
  progress/
  review/
  glossary/
  ui/
```

Do not create enormous files.

Keep domain logic out of presentational components.

---

# 56. STORE ARCHITECTURE

Refactor the Zustand store into clean domains if needed:

```text
learning state
review state
mastery state
session/UI state
```

Do not expose random mutations throughout the UI.

Actions should represent domain events:

```text
startConcept
markConceptUnderstood
completeQuiz
completeRecall
scheduleReview
recordLearningEvent
setLastVisitedPosition
```

rather than overly generic mutations.

---

# 57. MASTERY ALGORITHM

Keep it deterministic and explainable.

It should be possible to inspect a concept and understand:

```text
Learn:     0.8
Recall:    0.6
Apply:     0.2
Explain:   0.5
Interview: 0.1
```

and derive:

```text
Practice next
```

Do not create mysterious AI-generated mastery scores.

---

# 58. RECOMMENDATION ENGINE

For v0.1, deterministic recommendations are enough.

Recommendation priority:

```text
1. due review
2. prerequisite bottleneck
3. weak concept
4. next roadmap concept
5. optional exploration
```

Respect prerequisites.

Never recommend a concept before important prerequisites unless the user explicitly chooses Explore mode.

---

# 59. THE APP SHOULD FEEL LIKE A SYSTEM-DESIGN TOOL

Visual details that can reinforce this:

* subtle grid structure
* precise alignment
* technical metadata
* compact status indicators
* clear directional flow
* architecture-like relationship lines
* subtle monospace numbers
* thoughtful use of borders
* calm warm palette

Avoid turning that into cyberpunk.

No terminal wallpaper.

No hacker aesthetic.

No glowing neon.

No futuristic AI UI.

---

# 60. PRODUCT PERSONALITY

NO CAP should feel:

> “I built this because I actually want to get good at system design.”

Not:

> “A design agency made a study dashboard.”

The interface can have personality through:

* microcopy
* crisp labels
* smart empty states
* visual confidence
* small engineering jokes
* clean interactions

but the underlying experience must remain serious.

---

# 61. IMPORTANT: PRESERVE GOOD PARTS

Do NOT unnecessarily remove:

* Zustand
* static content model
* review scheduler
* mastery model
* PWA concept
* Cloudflare architecture
* existing seed content
* command palette concept
* warm neutral palette
* no-gradient requirement
* zero-cost requirement

Improve them.

---

# 62. IMPLEMENTATION ORDER

Work in this order:

## Phase 1 - Stabilize

Fix:

* type errors
* render-time mutations
* no-op actions
* theme
* streak timezone
* review bugs
* PWA issues
* missing CSS tokens
* invalid navigation

## Phase 2 - Content engine

Fix:

* scalable content loading
* validation
* block rendering
* prerequisite relationships
* lesson schema

## Phase 3 - Core UX

Redesign:

* shell
* Today
* Daily Dose
* Concept Library
* Concept Page
* Review
* Progress
* Roadmap
* Glossary

## Phase 4 - Learning behavior

Implement:

* Daily Dose session progression
* mastery events
* review scheduling
* recommendation engine
* last-visited restoration
* focus timer
* real analytics

## Phase 5 - Visual refinement

Polish:

* typography
* spacing
* colors
* interaction states
* responsive layouts
* accessibility
* animation

## Phase 6 - QA

Run all build/type checks and test critical flows.

---

# 63. DO NOT IMPLEMENT V0.5

Do NOT spend this pass implementing:

* architecture canvas
* labs
* real case studies
* full interview mode
* project system

The current repository should end as an **excellent v0.1**, not a mediocre v0.1-v2.0 mashup.

Create the architecture so those later versions are easy to add.

---

# 64. FINAL QUALITY BAR

Before considering the work complete, ask:

### Product

Does this feel like a complete learning product?

### Learning

Does the app actively teach or merely display text?

### UX

Can a first-time user immediately understand:

> What do I do now?

### Architecture

Is the implementation consistent with the v2.1 TRD?

### Content

Can a new concept be added without modifying core application code?

### Visual

Does this look like a premium engineering product rather than a generated dashboard?

### Interaction

Do buttons actually do what their labels promise?

### Persistence

Does progress remain after refresh?

### Offline

Can core learning still work without network/backend availability?

### Cost

Can it remain within the intended zero-cost architecture?

If any answer is no, fix it.

---

# 65. DELIVERABLE

When finished:

1. Modify the existing repository directly.
2. Do not merely provide suggestions.
3. Do not provide a patch description instead of implementation.
4. Return the complete updated project.
5. Preserve the project structure unless restructuring clearly improves maintainability.
6. Update README to reflect the actual implementation state.
7. Remove dead code and stale comments where appropriate.
8. Do not leave TODOs in core v0.1 functionality.
9. Ensure the project builds successfully.
10. Ensure all v0.1 routes work.
11. Ensure the visual result has been inspected at desktop/tablet/mobile sizes.

The output should be the final working NO CAP v0.1 repository/ZIP.

---

# FINAL DESIGN DIRECTIVE

The single most important instruction is this:

**Do not make NO CAP look like a dashboard that contains learning content.**

Make it feel like:

> **a purpose-built system-design learning cockpit.**

The learner should feel like they're entering a workspace where they can:

**learn a concept → see how it behaves → test their understanding → build mastery → come back later → eventually design real systems.**

Everything in the UI, architecture and interaction model should reinforce that feeling.

Do not optimize for how many screens exist.

Optimize for:

**quality of the learning loop.**
