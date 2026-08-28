# Seven-Day Pathway

**Birmingham Claude Impact Lab, August 28, 2026. Challenge 3: Make Economic Opportunity Easier to Reach.**

A briefing tool for Birmingham's community connectors: the people who already have
the network and already get asked. It turns public program pages into something a
connector can say out loud today, with the source attached, the limits stated, and a
warm handoff at the end.

**The tool does not decide anything.** It does not score people, predict who will
succeed, or assert that anyone is eligible for anything. Where the public pages do
not answer a question, it emits the question instead of a guess.

- **Live artifact:** https://sevenday.immatt.com
- **Demo starts here:** https://sevenday.immatt.com/#PROF-04
- **Source ledger:** [PROGRAMS.md](PROGRAMS.md)

## Team

- **Team name:** TBD
- **Team ID:** TBD
- **Team members:** Matt Ezell

## Challenge and primary user

- **Challenge:** 3 - Make Economic Opportunity Easier to Reach
- **Primary user:** A community connector. Both the informal kind (a neighborhood
  association officer, a pastor, a barber, a librarian) and the staffed kind (a
  resource navigator or workforce staffer at a partner organization).

### The connector we designed for

Bruce is an illustrative persona, not a real individual and not part of the synthetic
dataset. He is late twenties to early thirties, born to the community he serves. He
went through leadership training and, unlike many of the people he grew up with, he
stayed, and he spends his time building up the people around him. He is loosely
attached to a larger community-minded organization.

Three things about Bruce set the design:

**His credibility is generational, not positional.** Nobody appointed Bruce. People
listen to him because they have known him their whole lives. When he vouches for a
program he is spending trust built over decades, on behalf of people he will see again
at church on Sunday. That is why "This one could cost you" is a headline section rather
than a footnote, and why a program whose status cannot be confirmed is shown and
explained rather than quietly dropped.

**He has the leadership training. He does not have the facts.** Bruce already knows how
to have the conversation. He does not need a tool that coaches him on how to talk to
people, and would rightly resent one. He needs to know what is true today. So the tool
supplies facts, sources, and limits, and stays entirely out of the human part.

**He works from a phone and passes things on by message.** Not by sending a link to a
web app and hoping. That is why the brief exports as plain text, with the read date and
the limits written into the message body, so the caveats survive the forward.

His organizational attachment matters too: it means the organizer view has a real
audience. What Bruce learns across many conversations is exactly what his organization
needs in order to argue for something.

## Problem and repeated workflow

The repeated moment is **"someone just asked me what they should do."**

Birmingham already has a connector network, and a formal one. The city is divided into
23 communities and 99 neighborhoods, each neighborhood association electing a president,
vice president, and secretary: roughly 297 elected community connectors, a structure
running since 1974. The 23 community presidents form the Citizens Advisory Board, which
meets monthly with the mayor and council.

That network is under strain. [BirminghamWatch reported in February 2025](https://birminghamwatch.org/2025/02/21/birminghams-neighborhood-association-network-faces-challenges-at-50/)
that per-neighborhood funding was cut from $10,000 to $2,000 a year, city-funded
neighborhood newsletters were eliminated, and some association meetings now draw three
to five residents.

Strip a connector of budget and newsletters and what remains is their personal network
and their credibility. That is the asset this project is built to protect.

Because the connector's problem is not finding programs. It is answering with
confidence and without risk. Someone asks after a meeting. The connector half-remembers
a program, or repeats a flyer that is two years old. If they are right, someone's life
changes. If they are wrong, they have spent the one thing that makes them useful, and
the next person does not ask.

The facts that decide whether a pathway is reachable are spread across pages that
cannot see each other, so being right requires an hour of research the connector does
not have in the moment.

Three of those facts, all true at once, all on separate pages:

1. Jefferson State takes payment **at the moment of enrollment**.
2. The scholarship that would cover that payment is decided by an **Alabama Career
   Center**, not by the college.
3. Nobody publishes **how long that determination takes**.

A person who reads the program page in good faith and follows it does the steps in
the wrong order. They enroll and pay, or they ask about funding once the cohort has
opened and has run out of room. The pathway does not fail because the person was not
capable. It fails on sequencing.

## What the project does

Pick a synthetic profile. The connector gets a brief built around four questions:

- **Say this. It is sourced.** Facts read off a public page today, each with the
  verbatim quote attached so the connector can show their work.
- **Do not promise this. It is not yours to promise.** Every limit names the office
  that actually decides it, which turns a disappointment into a referral.
- **Send them here, and give them the words.** A named human, a phone number, and the
  exact question to ask, so the person arrives able to advocate for themselves.
- **This one could cost you.** Programs a connector has heard of but should not vouch
  for today, with what to say instead.

Plus a freshness contract: the brief states the date it was read and declares itself
stale after 30 days, because a page that goes out of date is merely wrong while a
person who goes out of date stops being the one people ask.

Behind that, under "Show the working", the full analysis:

- **Barriers**, read from the profile's own words, each naming the phrase that
  triggered it so a navigator can check the reasoning by eye.
- **Options**: real Birmingham programs, each assessed against each barrier with a
  verdict of *addresses / does not solve / cannot tell from the page*, a plain-language
  reason, and the verbatim source sentence behind it.
- **Collisions**: places where two true facts contradict each other. For the anchor
  profile, the class is deliberately built for evening students while the enrollment
  desk and the funding office both keep weekday business hours, so every step that
  unblocks the pathway happens during the shift this person cannot leave.
- **A seven-day plan**: ordered steps, each with a real date, the named person who
  confirms it, and the exact question to ask them. Steps that require reaching an
  office are moved off weekends.
- **Open questions**: what the tool does not know, stated rather than filled in.
- **An organizer view**: barrier frequency across the whole synthetic caseload, showing
  the pattern without exposing any individual profile. This is the view a connector
  carries into a Citizens Advisory Board meeting or a partner conversation, where the
  question is not "what should this person do" but "what keeps stopping everyone".

### The finding

Across the six synthetic profiles, **five are blocked by a document, a certification,
or a background check**, and **two by money needed before day one**. None are blocked
by ability, and none by a shortage of programs. Those two barrier types are handled by
different offices in a fixed order, and that order is not discoverable from any single
program page.

## Data and evidence sources

**Synthetic (fictional, never presented as real):**

- `public/data/economic-opportunity-profiles.csv`, copied unmodified from the event hub
  (`Birmingham-AI/claude-impact-lab`). Six fictional profiles, every row carrying
  `is_synthetic=true`. The app refuses to load any row without that marker, and renders
  a "Synthetic person, not real" badge on every profile it displays. The anchor profile
  for the demo is PROF-04, technology reskilling.

**Real (public program pages, each read once during the build window):**

Full ledger with verbatim quotes in [PROGRAMS.md](PROGRAMS.md). In summary: Jefferson
State Community College Fast Track and its IT Academy (requirements, cohort schedules,
prices, registration office hours, contacts), Lawson State Office of Workforce
Development, Innovate Birmingham, Central Six AlabamaWorks, and one third-party review
site used only as an explicitly-labeled unverified claim.

**Prior research, cited but not reused:** [onecounty.thenewguard.ai](https://onecounty.thenewguard.ai),
a public artifact mapping Jefferson County's 34 municipal governments, built before this
event. Cited as background the way a project would cite press coverage. No code and no
data from it appears in this repository.

## Architecture or approach

Vite + React + TypeScript, static JSON, no backend, no database, no network calls at
runtime beyond loading its own two data files.

```
public/data/programs.json    the verified program registry
public/data/*.csv            the event's synthetic profiles, unmodified
src/types.ts                 domain types, synthetic and real kept separate
src/lib/planner.ts           the rule engine (barriers, options, ordering, collisions)
src/lib/csv.ts               CSV reader
src/components/PlanView      per-profile plan
src/components/NavigatorView caseload aggregate
test/planner.test.ts         16 tests
```

The planner is a set of named rules in one reviewable file. Each rule states its own
reasoning in plain language and cites its source. There is no model in the runtime, no
scoring function, and no ranking of people. The recommendation rule is printed in the
UI above the options so a user can disagree with it:

> Options blocked by a data-quality problem are set aside. Of the rest, prefer the
> program whose stated destination most closely matches the goal in the profile, then
> the one that addresses the most of the profile's stated barriers, then the one with
> the earliest cohort a person could still join.

### How Claude was used to build it

- **Extraction with provenance.** Claude read each public program page and normalized it
  into the registry schema, carrying the verbatim source sentence into a `source_quote`
  field beside every extracted value. Any claim in the app can be audited back to the
  sentence that produced it. A test enforces that every requirement in the registry has
  both a quote and a URL.
- **Finding the contradictions.** The three data-quality problems in [PROGRAMS.md](PROGRAMS.md)
  (a cohort ending before it starts, a program whose operating status cannot be
  determined, and unpublished cost/schedule/requirements) surfaced during that reading
  and became features rather than corrections.
- **Building the planner and its tests**, then rendering the output and reading it
  critically. Two real defects were caught that way and fixed: the planner was ranking a
  CompTIA A+ course above an IT support course for someone who wants an IT support job,
  and it was scheduling phone calls to a weekday-only office on a Saturday.

### How Claude appears in the result

It does not. The deployed app is static and runs no model. Claude's contribution is the
provenance-carrying registry and the rule engine, both of which are readable artifacts a
person can check. That was a deliberate choice: for a tool whose entire value is that its
claims are auditable, a runtime that generates fresh prose about someone's eligibility
would undercut the point.

## Working artifact

- **Live:** https://sevenday.immatt.com (demo preset: [#PROF-04](https://sevenday.immatt.com/#PROF-04))
- Each profile is a URL preset, so every step of the demo is one link.

Run locally:

```bash
git clone https://github.com/mattezell/seven-day-pathway
cd seven-day-pathway
npm install
npm run dev      # http://localhost:5173/#PROF-04
npm test         # 16 planner tests
npm run build
```

## What works today

- All six synthetic profiles load and render, with the `is_synthetic` marker enforced at
  load time and displayed in the UI.
- PROF-04 produces a complete six-step plan with real dates, real phone numbers, a named
  confirmer and a scripted question on every step.
- Five real programs assessed against each barrier with sourced reasoning.
- The business-hours collision is detected and explained.
- Programs flagged `do_not_rely` are shown, explained, and excluded from the
  recommendation.
- Profiles outside the covered pathway return an explicit "not covered" result and route
  to the profile's named handoff owner, instead of a fabricated match.
- 16 tests pass. Typecheck and lint clean.

## Known limitations and simulated elements

- **The people are fictional.** All six profiles come from the event's synthetic dataset.
  No real person is represented anywhere in this project. No real client data, no PII, no
  HMIS records.
- **The programs are real, but nothing here is a confirmation.** Every record is a
  snapshot read on the morning of August 28, 2026. Cost, schedule, cohort dates, and
  eligibility change without notice. Only the program can confirm that a specific person
  qualifies for a specific opening, and only a Career Center can determine WIOA
  eligibility.
- **One pathway, not five.** Technology reskilling covers 1 of the 6 synthetic profiles
  directly. The other five are visible and produce an honest "not covered" result. The
  navigator view's barrier counts span all six, since barrier detection reads the profile
  text and does not depend on the registry.
- **Five programs is a demonstration, not a census** of Birmingham IT training.
- **The seven-day window is a planning horizon, not a promise.** For the anchor profile
  the honest answer is that a class cannot start within seven days. What can finish in
  seven days is the funding conversation and the paperwork that make the November cohort
  reachable, which is what the plan says.
- **Barrier detection is keyword matching** over the profile text. It is deliberately
  simple so a navigator can audit it, and it will miss barriers phrased in ways the rules
  do not anticipate. It is a prompt for a human, not a substitute for one.
- **No writes to any live system.** Nothing is submitted, no ticket or referral or
  application is filed, and each source page was fetched once by hand.

## Next step toward a pilot

**Birmingham's Community Resource Services Division circulates one connector brief to
the 99 neighborhood associations, and collects what the officers get asked.**

The division already exists to be the liaison between neighborhood associations and city
government, already convenes these officers, and is reachable at (205) 297-8192. It does
not need to adopt software. It needs to hand its officers one page they can trust, and
tell us where it was wrong.

That is the pilot: one pathway, one printed brief, one cycle of the Citizens Advisory
Board's monthly meeting. The measure of success is not usage. It is whether an officer
says "I used this and it held up," or "I used this and it was out of date."

The unblocking ask that runs alongside it: **Central Six AlabamaWorks publishes how long
a WIOA eligibility determination currently takes.** That single unpublished number is
what makes the ordering problem invisible, and with it the brief's "start this
conversation today" becomes a real deadline. Central Six is at 205-458-8966 ext. 1350.

## Demo video

Not required; the artifact is reviewable at the public link above.
