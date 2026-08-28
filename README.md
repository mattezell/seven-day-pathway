# Seven-Day Pathway (Team 3?)

A seven-day action planner for technology reskilling in Birmingham, built for the
Birmingham Claude Impact Lab on August 28, 2026.

**The artifact never decides anything.** It produces a seven-day plan in which every
line carries its source, its freshness stamp, and the named human who confirms it.

## Team

- **Team name:** TBD
- **Team ID:** TBD
- **Team members (optional):** Matt Ezell

## Challenge and primary user

- **Challenge:** 3 - Make Economic Opportunity Easier to Reach
- **Primary user:** A career-changing worker pursuing technology reskilling, and the
  workforce navigator sitting beside them.

## Problem and repeated workflow

The repeated moment is "what can I do next?" A worker in a daytime retail shift wants
an entry-level IT support role. Birmingham has real programs that serve exactly this
person, but the requirements, schedules, costs, and intake steps live on separate
pages in separate formats, and none of them can be confirmed without a phone call.
The friction is not a shortage of programs. It is that turning a program page into a
sequence of things to do this week takes a navigator an hour per person.

## What the project does

TBD - filled in as the build lands.

## Data and evidence sources

- **Synthetic:** `resources/data/economic-opportunity-profiles.csv` from the event
  hub repository (Birmingham-AI/claude-impact-lab). Six fictional profiles, every row
  carrying `is_synthetic=true`. The anchor profile for the demo path is PROF-04,
  technology reskilling. No real person is represented anywhere in this project.
- **Real (public program pages):** fetched live during the Lab, each record stamped
  with its source URL and fetch timestamp. Full list in `PROGRAMS.md`.
- **Prior research cited, not reused:** onecounty.thenewguard.ai, a public artifact
  mapping Jefferson County's 34 municipal governments. Cited as background only; no
  code or data from it appears in this project.

## Architecture or approach

TBD - filled in as the build lands.

### How Claude was used

TBD.

### How Claude appears in the result

TBD.

## Working artifact

TBD.

## What works today

TBD.

## Known limitations and simulated elements

- **The person is synthetic.** All six profiles are fictional. The app displays an
  `is_synthetic` badge on every profile it renders.
- **The programs are real, but nothing here is a confirmation.** Program requirements
  are read from public pages at a stamped moment in time. Cost, schedule, cohort
  dates, and eligibility change without notice. Only the program itself can confirm
  that a specific person qualifies for a specific opening.
- **No prediction, no score, no guarantee.** The project does not rank people, predict
  whether anyone will succeed, or assert eligibility for anything.

## Next step toward a pilot

TBD.

## Demo video (if needed)

Not required if the public link is live.
