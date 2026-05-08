# Product Build SOP
*Learning capture from DayOS — living document*
*v1.0 | Last updated: 8 May 2026*

## 5 Phases — don't skip ahead
1. **Idea & Validation** — what problem, who for, is it worth solving
2. **PRD** — synthesize raw thinking into structure (template at end)
3. **MVP Shell** — ship live URL fast with structure + 1 core feature only
4. **Use** — actually use the live product daily for ≥1 week before adding
5. **Refine** — improvements driven by real friction, not ideation

Don't move on until the previous phase has produced its output.

## Mistakes from DayOS — don't repeat
- **Built features on data that doesn't reliably exist.** "Pending Pile" was specced as metric, pattern, AND review section before realising tags have no resolution mechanism. Confirm the data source supports the feature before stacking layers on top.
- **Designed tagging architecture without separating concerns first.** Took multiple painful iterations to land on "content tags vs project tags, local by default." Ask first: what does this tag do, where does it spill?
- **Created top-level types when tags would have done.** Insight, Project — both eventually replaced by `#insight` and `#projectname` tags. When in doubt, prefer tags over types.
- **Over-engineered the first weekly review.** 9 sections cut to 5. Always start with the 3 most useful, add only what proves missing in real use.
- **Followed AI suggestions reflexively when usage instincts were better.** DFT-panel + tag hybrid was my idea, beat the AI's. "Keep Projects under Journal" pushback was right. Trust usage knowledge — critique AI output honestly.
- **Built features before living with them.** Multiple specs reworked or dropped after real use. Use live for ≥3 days before stacking the next feature.
- **Didn't audit the live app regularly.** Calendar bug went unnoticed for weeks because only new features got tested. Fixed: 10-min live walkthrough every Sunday.
- **Treated working memory as full project context.** Late SOP draft drew only from recent sessions. When it matters, scan back through the actual arc — don't reconstruct from recent.

## What worked — keep doing
- **PRD as synthesizer** — adding structure to raw bullets surfaced gaps invisible from inside the idea
- **Live app audit before new specs** — fresh-eyes review of the working product caught what PRD missed
- **Forms for elicitation** when design space is large — beats freeform prose discussion
- **Mockups before code** for non-trivial UI — caught interaction problems text specs missed
- **Sequential prompts with sub-task confirmation** — small bounded changes I could validate before stacking next
- **CLAUDE.md persistent context + `wrap and teach` / `summarize takeaways` rituals** — kept session-to-session continuity
- **User pushback mid-build treated as signal, not noise** — pause and re-architect rather than patching

## Decision principles (compressed lessons)
- **Backend flexibility, frontend simplicity** — configurable data structures; defer customization UI until needed
- **Local by default, global by exception** — data crossing boundaries must be explicit
- **If you can't track it accurately, don't measure it** — fake data is worse than no data
- **Optimize for low-friction first; trim later** — pruning is easier than building
- **Honest demotion, not abandonment** — features and projects park, they don't die
- **One change at a time** — sequential beats parallel
- **Architectural refactors before features** — CSS variables before light mode toggle
- **Single source of truth** for shared logic — defined once, used everywhere
- **Separation > consolidation** when complexity feels unsustainable

## Anti-patterns watchlist
- Over-engineering before first usage
- Mandatory fields anywhere (kills adoption when tired)
- Auto-spillover of tags or data across boundaries
- Mixing capture mode and analysis mode in same UI
- Reflexive AI validation — critique honestly
- Building more before using what exists
- Pseudo-productivity: prompting as substitute for using

## Prompt patterns for Claude Code
- Sub-task structure: "N steps — confirm each before moving on"
- Single-file constraint when architecture demands it
- Explicit "do not break" list of existing functionality
- Always specify Firestore paths and document fields
- IMPLEMENTATION NOTES block at end of every prompt
- One prompt = one bounded change
- Read source first when uncertain — don't assume structures

## Session rituals
- **Start**: pull latest, state goal in one sentence, confirm prompt or sub-task being run
- **End**: `wrap and teach` (deep) or `summarize takeaways` (quick) — defined in CLAUDE.md — then commit and push
- **Weekly (Sunday)**: 10-min live app audit — open every screen, click every button, catch silent bugs

## When stuck
- User pushback mid-build = signal, not noise → pause, re-architect, don't patch
- Complexity feels unsustainable → answer is *separation*, not consolidation
- Metric won't track accurately → drop it or rebuild data source first
- Working memory feels insufficient → scan back through actual arc, don't reconstruct from recent
