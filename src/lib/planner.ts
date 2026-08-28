/**
 * The planner.
 *
 * Every output of this module is produced by a named rule that states its own
 * reasoning in plain language and cites the source sentence behind it. There is
 * no score, no ranking of people, and no prediction. When the rules cannot
 * answer a question, the planner emits the question rather than a guess.
 */
import type {
  AccessCollision,
  BarrierAssessment,
  BarrierKind,
  Cohort,
  Contact,
  PathwayOption,
  PlanStep,
  Program,
  ProgramRegistry,
  SevenDayPlan,
  SyntheticProfile,
} from '../types';

/** The Lab's build date. Fixed so the demo reads the same all day. */
export const TODAY = new Date('2026-08-28T00:00:00-05:00');

const DAY_MS = 24 * 60 * 60 * 1000;

interface BarrierRule {
  kind: BarrierKind;
  label: string;
  /** Which profile fields this rule reads. */
  fields: (keyof SyntheticProfile)[];
  pattern: RegExp;
  describe: (matchedText: string) => string;
}

/**
 * Barrier detection. Each rule reads named fields of the synthetic profile and
 * says which words triggered it, so a navigator can see why a barrier was named.
 */
export const BARRIER_RULES: BarrierRule[] = [
  {
    kind: 'schedule',
    label: 'Daytime work schedule',
    fields: ['constraint'],
    pattern: /works?\s+(daytime|day)\b|daytime\s+\w*\s*shift|needs evening options/i,
    describe: (m) => `The profile states a daytime working commitment ("${m}"), so anything meeting in business hours conflicts with income.`,
  },
  {
    kind: 'transport',
    label: 'Transportation',
    fields: ['constraint'],
    pattern: /vehicle|transit|transport/i,
    describe: (m) => `The profile states a transportation limit ("${m}"), so travel to a campus is a cost in time and money, not a detail.`,
  },
  {
    kind: 'upfront_cost',
    label: 'Money needed before day one',
    fields: ['constraint'],
    pattern: /afford|upfront|up front|working capital|collateral/i,
    describe: (m) => `The profile states a limit on money available before starting ("${m}"), so any fee due at enrollment is a gate, not a line item.`,
  },
  {
    kind: 'documentation',
    label: 'Documents and checks',
    fields: ['constraint', 'requirement'],
    pattern: /permit|certifi\w*|documentation|background check|screening|records|business plan|diploma/i,
    describe: (m) => `A document, certification, or check is required ("${m}"). These take other people's time, so they set the earliest possible start date.`,
  },
  {
    kind: 'experience',
    label: 'No prior experience',
    fields: ['constraint', 'currentState'],
    pattern: /no prior work experience|no certifications/i,
    describe: (m) => `The profile reports no prior experience or credentials ("${m}"), so programs that assume a background are not reachable yet.`,
  },
];

export function detectBarriers(profile: SyntheticProfile): BarrierAssessment[] {
  const found: BarrierAssessment[] = [];

  for (const rule of BARRIER_RULES) {
    for (const field of rule.fields) {
      const value = String(profile[field] ?? '');
      const match = value.match(rule.pattern);
      if (!match) continue;
      if (found.some((f) => f.barrier === rule.kind)) continue;

      found.push({
        barrier: rule.kind,
        barrierLabel: rule.label,
        verdict: 'does_not_address',
        why: rule.describe(match[0]),
        sourceQuote: value,
        sourceUrl: undefined,
      });
    }
  }

  return found;
}

function isEveningCohort(cohort: Cohort): boolean {
  const match = cohort.time.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return false;
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === 'pm') hour += 12;
  return hour >= 17;
}

function isOnline(program: Program): boolean {
  return /online/i.test(program.format);
}

export function nextJoinableCohort(program: Program, today: Date = TODAY): Cohort | null {
  const upcoming = program.cohorts
    .filter((c) => new Date(`${c.start_date}T00:00:00-05:00`).getTime() >= today.getTime())
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  return upcoming[0] ?? null;
}

export function daysUntil(dateIso: string, today: Date = TODAY): number {
  return Math.round((new Date(`${dateIso}T00:00:00-05:00`).getTime() - today.getTime()) / DAY_MS);
}

/**
 * How one program relates to one barrier. The verdict is always accompanied by
 * the reason and, where one exists, the sentence on the program's own page.
 */
function assessBarrier(
  barrier: BarrierAssessment,
  program: Program,
  registry: ProgramRegistry,
): BarrierAssessment {
  const evening = program.cohorts.some(isEveningCohort);
  const online = isOnline(program);
  const docs = program.requirements.filter((r) => r.kind === 'document' || r.kind === 'assessment');
  const payment = program.requirements.find((r) => r.kind === 'payment');

  switch (barrier.barrier) {
    case 'schedule': {
      if (evening && online) {
        const cohort = program.cohorts.find(isEveningCohort)!;
        return {
          ...barrier,
          verdict: 'addresses',
          why: `Classes meet ${cohort.days}, ${cohort.time}, delivered online. That sits outside a daytime shift.`,
          sourceQuote: program.format_source_quote,
          sourceUrl: program.schedule_url ?? program.program_url,
        };
      }
      if (program.cohorts.length === 0) {
        return {
          ...barrier,
          verdict: 'unknown',
          why: 'This provider does not publish class times, so whether it fits a daytime shift cannot be answered from the page.',
          sourceUrl: program.program_url,
        };
      }
      return {
        ...barrier,
        verdict: 'does_not_address',
        why: 'The published meeting times fall inside a daytime working schedule.',
        sourceUrl: program.schedule_url ?? program.program_url,
      };
    }

    case 'transport': {
      if (online) {
        return {
          ...barrier,
          verdict: 'addresses',
          why: 'Instruction is delivered online, so no travel to a campus is required for class itself. Enrollment help and the funding office are still in-person or phone.',
          sourceQuote: program.format_source_quote,
          sourceUrl: program.program_url,
        };
      }
      return {
        ...barrier,
        verdict: 'unknown',
        why: 'The page does not state a delivery mode, so travel requirements are unknown.',
        sourceUrl: program.program_url,
      };
    }

    case 'upfront_cost': {
      if (program.cost_usd === null) {
        return {
          ...barrier,
          verdict: 'unknown',
          why: 'This provider does not publish a price. It cannot be planned around until someone calls and asks.',
          sourceUrl: program.program_url,
        };
      }
      if (program.cost_usd === 0) {
        return {
          ...barrier,
          verdict: 'addresses',
          why: 'Historically free to students. Whether that still holds is a separate question flagged on this program.',
          sourceUrl: program.program_url,
        };
      }
      const funding = registry.funding_paths.find((f) => program.funding_paths.includes(f.id));
      return {
        ...barrier,
        verdict: 'does_not_address',
        why: `The course costs $${program.cost_usd.toLocaleString()}, and ${payment?.label.toLowerCase() ?? 'payment is due at enrollment'}. ${
          funding
            ? `A ${funding.name} may cover it, but ${funding.determined_by.toLowerCase()} decides that, not the college. That is why the funding step comes first in the plan below.`
            : 'No funding path is recorded for this program.'
        }`,
        sourceQuote: payment?.source_quote,
        sourceUrl: payment?.source_url ?? program.program_url,
      };
    }

    case 'documentation': {
      if (docs.length === 0) {
        return {
          ...barrier,
          verdict: 'unknown',
          why: 'This provider does not publish entry requirements, so the paperwork burden is unknown.',
          sourceUrl: program.program_url,
        };
      }
      const conditional = docs.filter((d) => d.conditional);
      return {
        ...barrier,
        verdict: 'does_not_address',
        why: `This program requires: ${docs.map((d) => d.label).join('; ')}.${
          conditional.length > 0
            ? ` One of these applies only in some cases, so it is a question to ask rather than a task to assume.`
            : ''
        } Gathering these is what sets the earliest realistic start date.`,
        sourceQuote: docs[0].source_quote,
        sourceUrl: docs[0].source_url ?? program.program_url,
      };
    }

    case 'experience': {
      const noExp = program.requirements.find((r) => r.id === 'no_experience');
      if (noExp) {
        return {
          ...barrier,
          verdict: 'addresses',
          why: 'The program states that no previous computer experience is required.',
          sourceQuote: noExp.source_quote,
          sourceUrl: noExp.source_url,
        };
      }
      return {
        ...barrier,
        verdict: 'unknown',
        why: 'The page does not say whether prior experience is assumed. Worth asking on the first call.',
        sourceUrl: program.program_url,
      };
    }

    default:
      return { ...barrier, verdict: 'unknown', why: 'No rule covers this barrier.' };
  }
}

function isBlocking(program: Program): { blocking: boolean; reason?: string } {
  if (program.recommendation === 'do_not_plan_around_until_confirmed') {
    const flag = program.data_quality_flags.find((f) => f.severity === 'do_not_rely');
    return { blocking: true, reason: flag?.note };
  }
  return { blocking: false };
}

/** Programs are matched to a profile by pathway, and the reason is stated. */
export function buildOptions(
  profile: SyntheticProfile,
  barriers: BarrierAssessment[],
  registry: ProgramRegistry,
): PathwayOption[] {
  if (profile.pathway !== registry.registry_meta.pathway) return [];

  return registry.programs.map((program) => {
    const { blocking, reason } = isBlocking(program);
    return {
      program,
      inclusionReason: `${program.provider_short} runs this as ${
        program.academy ?? 'a workforce program'
      }, and it leads to ${program.leads_to.toLowerCase()}. It is listed because the profile's stated goal is "${profile.goal}".`,
      assessments: barriers.map((b) => assessBarrier(b, program, registry)),
      nextCohort: nextJoinableCohort(program),
      blocking,
      blockingReason: reason,
    };
  });
}

/**
 * Recommendation rule, stated in full so it can be argued with:
 * among options that are not blocked, prefer the one that addresses the most of
 * this profile's barriers; break ties by the earliest cohort a person could still
 * join. A program with no joinable cohort can still be recommended, because the
 * seven-day work is preparation, not enrolment.
 */
export const RECOMMENDATION_RULE =
  'Among options that are not blocked by a data-quality problem, the planner prefers the one that addresses the most of this profile\'s stated barriers. Ties are broken by the earliest cohort a person could still join. Nothing is scored, and the person is never ranked.';

export function chooseRecommended(options: PathwayOption[]): PathwayOption | null {
  const eligible = options.filter((o) => !o.blocking);
  if (eligible.length === 0) return null;

  return eligible.reduce((best, current) => {
    const score = (o: PathwayOption) => o.assessments.filter((a) => a.verdict === 'addresses').length;
    if (score(current) !== score(best)) return score(current) > score(best) ? current : best;
    const start = (o: PathwayOption) => o.nextCohort?.start_date ?? '9999-12-31';
    return start(current) < start(best) ? current : best;
  });
}

function formatDayWindow(startDay: number, endDay: number, today: Date = TODAY): string {
  const fmt = (offset: number) =>
    new Date(today.getTime() + offset * DAY_MS).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Chicago',
    });
  return startDay === endDay
    ? `Day ${startDay} (${fmt(startDay - 1)})`
    : `Days ${startDay}-${endDay} (${fmt(startDay - 1)} to ${fmt(endDay - 1)})`;
}

/**
 * The seven-day plan. The ordering is not cosmetic: when a funding path declares
 * a `funding_before_enrollment` constraint and the profile has a money barrier,
 * the funding conversation is step one, because enrolling first means having paid.
 */
export function buildSteps(
  profile: SyntheticProfile,
  option: PathwayOption | null,
  barriers: BarrierAssessment[],
  registry: ProgramRegistry,
  blockedOptions: PathwayOption[],
): PlanStep[] {
  if (!option) return [];

  const steps: PlanStep[] = [];
  const program = option.program;
  const funding = registry.funding_paths.find((f) => program.funding_paths.includes(f.id));
  const hasMoneyBarrier = barriers.some((b) => b.barrier === 'upfront_cost');
  const push = (step: Omit<PlanStep, 'order'>) => steps.push({ ...step, order: steps.length + 1 });

  if (funding && hasMoneyBarrier && funding.ordering_constraint.rule === 'funding_before_enrollment') {
    const contact = funding.contacts[0];
    push({
      dayWindow: formatDayWindow(1, 1),
      title: `Open the ${funding.name} conversation today`,
      detail: `Call the ${contact.name}${contact.phone ? ` at ${contact.phone}` : ''} and ask to start an eligibility determination. Ask three things: whether this profile's situation qualifies, exactly which documents they need, and how long a determination takes.`,
      doneBy: 'the person',
      confirmedBy: contact.name,
      confirmationQuestion: 'Am I eligible for a WIOA training scholarship, what do you need from me, and how long will a determination take?',
      contact,
      why: funding.ordering_constraint.why,
      sourceQuotes: funding.ordering_constraint.source_quotes,
      sourceUrls: [funding.source_url],
      isConfirmationOnly: false,
    });
  }

  const started = program.cohorts.find((c) => c.status === 'already_started');
  const providerContact = program.contacts[0];
  if (started && providerContact) {
    push({
      dayWindow: formatDayWindow(1, 2),
      title: `Ask whether the ${started.days} cohort still accepts a late start`,
      detail: `The ${started.days} section began ${started.start_date}, ${Math.abs(
        daysUntil(started.start_date),
      )} days ago. Whether someone can still join is a question only ${program.provider_short} can answer, and it is worth one phone call before planning around a later date.`,
      doneBy: 'the person',
      confirmedBy: providerContact.name,
      confirmationQuestion: `The ${started.days} section started on ${started.start_date}. Can someone still enroll, or should I plan for the next cohort?`,
      contact: providerContact,
      why: 'A cohort that already started is not automatically closed, and the difference between joining now and waiting is months of income.',
      sourceQuotes: started.status_note ? [started.status_note] : [],
      sourceUrls: [program.schedule_url ?? program.program_url],
      isConfirmationOnly: true,
    });
  }

  const docs = program.requirements.filter((r) => r.kind === 'document' || r.kind === 'assessment');
  if (docs.length > 0) {
    const conditional = docs.filter((d) => d.conditional);
    push({
      dayWindow: formatDayWindow(2, 5),
      title: 'Gather the documents the program requires at enrollment',
      detail: `Collect: ${docs
        .filter((d) => !d.conditional)
        .map((d) => d.label)
        .join('; ')}.${
        conditional.length > 0
          ? ` Then ask whether ${conditional
              .map((d) => d.label.toLowerCase())
              .join(' or ')} applies in this case, rather than assuming it does.`
          : ''
      } The same documents are usually what the funding office asks for, so gathering them once serves both steps.`,
      doneBy: 'the person',
      confirmedBy: providerContact?.name ?? program.provider,
      confirmationQuestion: 'Here is what I have. Is anything missing, and does the reading assessment apply to me?',
      contact: providerContact,
      why: 'These are the requirements the program publishes for entry. Documents depend on other offices, so they set the earliest realistic start date.',
      sourceQuotes: docs.map((d) => d.source_quote).filter((q): q is string => Boolean(q)),
      sourceUrls: docs.map((d) => d.source_url).filter((u): u is string => Boolean(u)),
      isConfirmationOnly: false,
    });
  }

  const flaggedCohort = program.cohorts.find((c) => c.data_quality_flag);
  if (flaggedCohort) {
    const flag = program.data_quality_flags.find((f) => f.id === flaggedCohort.data_quality_flag);
    push({
      dayWindow: formatDayWindow(2, 5),
      title: 'Confirm the published cohort dates, which do not read correctly',
      detail: flag?.note ?? 'The published dates for this cohort are internally inconsistent and need confirmation.',
      doneBy: 'the person',
      confirmedBy: providerContact?.name ?? program.provider,
      confirmationQuestion: `The schedule lists this section as ${flag?.source_quote ?? 'running to a date before it starts'}. What are the real start and end dates?`,
      contact: providerContact,
      why: 'Planning several months of evenings around a date that is printed wrong is a real risk, and one call removes it.',
      sourceQuotes: flag?.source_quote ? [flag.source_quote] : [],
      sourceUrls: [program.schedule_url ?? program.program_url],
      isConfirmationOnly: true,
    });
  }

  for (const blocked of blockedOptions) {
    push({
      dayWindow: formatDayWindow(3, 5),
      title: `Resolve, but do not plan around, ${blocked.program.provider}`,
      detail: `${blocked.blockingReason ?? 'This program has an unresolved data-quality problem.'} One email or call settles it. Until it is settled, this plan does not depend on it.`,
      doneBy: 'the person',
      confirmedBy: blocked.program.provider,
      confirmationQuestion: 'Is this program currently running, is it accepting applications, and what are the current eligibility requirements?',
      why: 'A directory would list this program and a person could lose a week on it. Naming the uncertainty is more useful than hiding or deleting the listing.',
      sourceQuotes: blocked.program.data_quality_flags
        .map((f) => f.source_quote)
        .filter((q): q is string => Boolean(q)),
      sourceUrls: [blocked.program.program_url],
      isConfirmationOnly: true,
    });
  }

  const cohort = option.nextCohort;
  push({
    dayWindow: formatDayWindow(6, 7),
    title: 'Decide with the funding answer in hand, not before',
    detail: cohort
      ? `The next cohort of ${program.program_name} starts ${cohort.start_date}, ${daysUntil(
          cohort.start_date,
        )} days out. That is enough time for a funding determination if it started on day one, and not enough if it starts later. Review what came back this week with a navigator and choose.`
      : `No cohort of ${program.program_name} has a published start date a person could still join. Review what came back this week with a navigator and choose between waiting for the next posting and a different program.`,
    doneBy: 'the person',
    confirmedBy: `${profile.handoffOwnerType} (the handoff owner named in the synthetic profile)`,
    confirmationQuestion: 'Given what the career center and the college said this week, which program and which cohort do we commit to?',
    why: 'The decision is the person\'s to make, with a navigator, once the unknowns are answered. This tool does not make it and does not recommend enrolling before funding is settled.',
    sourceQuotes: [],
    sourceUrls: [],
    isConfirmationOnly: false,
  });

  return steps;
}

/**
 * A collision is where two true facts about a person's week contradict each
 * other. They are the most useful thing this tool finds, because neither source
 * page can see the other.
 */
export function detectCollisions(
  barriers: BarrierAssessment[],
  option: PathwayOption | null,
  registry: ProgramRegistry,
): AccessCollision[] {
  const collisions: AccessCollision[] = [];
  if (!option) return collisions;

  const hasSchedule = barriers.some((b) => b.barrier === 'schedule');
  const help = option.program.in_person_help;
  const funding = registry.funding_paths.find((f) => option.program.funding_paths.includes(f.id));

  if (hasSchedule && help) {
    collisions.push({
      title: 'The class is built for evening students. The enrollment desk is not.',
      detail: `${option.program.provider_short} teaches this course online in the evening, which is exactly why it fits. But registration help runs ${help.hours}, and the career center that decides funding keeps business hours too. Every step that unblocks this pathway happens during the shift this person cannot leave.`,
      mitigation:
        'On the first call, ask for a callback window outside business hours, or whether intake and document submission can be completed by email or online. Ask before taking unpaid time off, not after.',
      sourceQuotes: [help.source_quote, funding?.determined_by_source_quote].filter(
        (q): q is string => Boolean(q),
      ),
    });
  }

  return collisions;
}

export function collectOpenQuestions(
  option: PathwayOption | null,
  registry: ProgramRegistry,
): string[] {
  const questions: string[] = [];
  if (!option) return questions;

  const funding = registry.funding_paths.find((f) => option.program.funding_paths.includes(f.id));
  if (funding) questions.push(...funding.unknowns);

  for (const flag of option.program.data_quality_flags) {
    if (flag.severity === 'confirm_before_relying' || flag.severity === 'incomplete') {
      questions.push(flag.note);
    }
  }

  if (option.program.exam_fee_included === false) {
    questions.push(
      `The certification exam is not included in the course fee for ${option.program.program_name}, and the exam price is not published here. Ask what it costs before budgeting.`,
    );
  }

  return questions;
}

export function buildPlan(profile: SyntheticProfile, registry: ProgramRegistry): SevenDayPlan {
  const barriers = detectBarriers(profile);
  const options = buildOptions(profile, barriers, registry);
  const recommendedOption = chooseRecommended(options);
  const blockedOptions = options.filter((o) => o.blocking);

  return {
    profile,
    barriers,
    options,
    recommendedOption,
    steps: buildSteps(profile, recommendedOption, barriers, registry, blockedOptions),
    collisions: detectCollisions(barriers, recommendedOption, registry),
    openQuestions: collectOpenQuestions(recommendedOption, registry),
    generatedFor: profile.profileId,
  };
}

export function contactLine(contact: Contact): string {
  return [contact.phone, contact.email, contact.address].filter(Boolean).join(' | ');
}
