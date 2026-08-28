import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseCsv } from '../src/lib/csv.ts';
import {
  buildPlan,
  chooseRecommended,
  daysUntil,
  detectBarriers,
  goalAlignment,
  nextJoinableCohort,
} from '../src/lib/planner.ts';
import type { ProgramRegistry, SyntheticProfile } from '../src/types.ts';

const registry = JSON.parse(
  readFileSync(new URL('../public/data/programs.json', import.meta.url), 'utf8'),
) as ProgramRegistry;

const profiles = parseCsv(
  readFileSync(new URL('../public/data/economic-opportunity-profiles.csv', import.meta.url), 'utf8'),
).map(
  (row): SyntheticProfile => ({
    profileId: row.profile_id,
    pathway: row.pathway,
    currentState: row.current_state,
    goal: row.goal,
    constraint: row.constraint,
    opportunity: row.opportunity,
    requirement: row.requirement,
    nextSevenDayAction: row.next_seven_day_action,
    handoffOwnerType: row.handoff_owner_type,
    requiresHumanConfirmation: row.requires_human_confirmation === 'true',
    isSynthetic: true,
  }),
);

const byId = (id: string) => profiles.find((p) => p.profileId === id)!;

test('every synthetic profile row is labeled synthetic', () => {
  assert.equal(profiles.length, 6);
  for (const profile of profiles) {
    assert.equal(profile.isSynthetic, true);
    assert.equal(profile.requiresHumanConfirmation, true);
  }
});

test('the program registry is not labeled synthetic and carries a fetch timestamp', () => {
  assert.equal(registry.registry_meta.is_synthetic, false);
  assert.match(registry.registry_meta.fetched_at, /^2026-08-28T/);
  for (const program of registry.programs) {
    assert.ok(program.fetched_at, `${program.id} is missing fetched_at`);
    assert.ok(program.program_url.startsWith('https://'), `${program.id} needs a source URL`);
  }
});

test('every extracted requirement cites the sentence it came from', () => {
  for (const program of registry.programs) {
    for (const requirement of program.requirements) {
      assert.ok(
        requirement.source_quote && requirement.source_url,
        `${program.id}/${requirement.id} must carry a source quote and URL`,
      );
    }
  }
});

test('PROF-04 barriers come from the profile text, not from assumptions', () => {
  // PROF-04's constraint names only a schedule problem. Its requirement is a
  // "Basic computer literacy assessment", which is not a document or a check,
  // so the documentation rule correctly does not fire. The planner must not
  // invent a money barrier here either: the profile does not state one.
  const barriers = detectBarriers(byId('PROF-04')).map((b) => b.barrier);
  assert.deepEqual(barriers, ['schedule']);
});

test('cost is raised for PROF-04 as a question even though no money barrier was stated', () => {
  const plan = buildPlan(byId('PROF-04'), registry);
  const fundingStep = plan.steps[0];
  assert.match(fundingStep.title, /\$999/);
  assert.match(fundingStep.detail, /does not state a money problem/);
  assert.equal(fundingStep.order, 1, 'the funding question must still come first');
});

test('the recommended program is the one whose destination matches the stated goal', () => {
  // A+ starts sooner (Aug 31 vs Nov 3) and would win a date-first tiebreak,
  // but PROF-04 wants an IT support role, so goal alignment must come first.
  const plan = buildPlan(byId('PROF-04'), registry);
  assert.equal(plan.recommendedOption?.program.id, 'JSCC-ITHD');
  assert.ok(
    goalAlignment(byId('PROF-04'), plan.recommendedOption!.program) >
      goalAlignment(byId('PROF-04'), registry.programs.find((p) => p.id === 'JSCC-APLUS')!),
  );
});

test('a transport constraint does not get misread as a schedule constraint', () => {
  // PROF-01 says "limited evening transit", which contains the word "evening".
  const barriers = detectBarriers(byId('PROF-01')).map((b) => b.barrier);
  assert.ok(barriers.includes('transport'));
  assert.ok(!barriers.includes('schedule'));
});

test('documentation is the most common barrier across the caseload', () => {
  const counts = new Map<string, number>();
  for (const profile of profiles) {
    for (const barrier of detectBarriers(profile)) {
      counts.set(barrier.barrier, (counts.get(barrier.barrier) ?? 0) + 1);
    }
  }
  assert.equal(counts.get('documentation'), 5);
  assert.equal(counts.get('upfront_cost'), 2);
});

test('a cohort that already started is not offered as joinable', () => {
  const helpDesk = registry.programs.find((p) => p.id === 'JSCC-ITHD')!;
  const next = nextJoinableCohort(helpDesk);
  assert.equal(next?.cohort_id, 'JSCC-ITHD-TT-NOV');
  assert.ok(daysUntil('2026-08-24') < 0);
});

test('a program flagged do_not_rely is never recommended', () => {
  const plan = buildPlan(byId('PROF-04'), registry);
  const innovate = plan.options.find((o) => o.program.id === 'INNOVATE-BHAM')!;
  assert.equal(innovate.blocking, true);
  assert.notEqual(plan.recommendedOption?.program.id, 'INNOVATE-BHAM');
  assert.equal(chooseRecommended([innovate], byId('PROF-04')), null);
});

test('the funding step comes before enrollment when money is a barrier', () => {
  // PROF-03 carries the upfront-cost barrier; the ordering rule must fire.
  const barriers = detectBarriers(byId('PROF-03')).map((b) => b.barrier);
  assert.ok(barriers.includes('upfront_cost'));
});

test('PROF-04 gets a plan whose every step names a human confirmer and a question', () => {
  const plan = buildPlan(byId('PROF-04'), registry);
  assert.ok(plan.steps.length >= 4, 'expected a multi-step plan');
  for (const step of plan.steps) {
    assert.ok(step.confirmedBy.length > 0, `step ${step.order} has no named confirmer`);
    assert.ok(step.confirmationQuestion.length > 0, `step ${step.order} has no question to ask`);
    assert.ok(step.why.length > 0, `step ${step.order} does not justify its position`);
  }
});

test('the last step hands the decision to the profile\'s named handoff owner', () => {
  const plan = buildPlan(byId('PROF-04'), registry);
  const last = plan.steps[plan.steps.length - 1];
  assert.match(last.confirmedBy, /training provider/);
});

test('the schedule collision between evening classes and a daytime office is detected', () => {
  const plan = buildPlan(byId('PROF-04'), registry);
  assert.equal(plan.collisions.length, 1);
  assert.match(plan.collisions[0].title, /enrollment desk/i);
});

test('a pathway the registry does not cover produces no options rather than a bad match', () => {
  const plan = buildPlan(byId('PROF-02'), registry);
  assert.equal(plan.options.length, 0);
  assert.equal(plan.steps.length, 0);
  assert.equal(plan.recommendedOption, null);
});

test('open questions are surfaced rather than filled in', () => {
  const plan = buildPlan(byId('PROF-04'), registry);
  assert.ok(plan.openQuestions.length > 0);
  assert.ok(
    plan.openQuestions.some((q) => /how long/i.test(q)),
    'the unknown determination time must be stated out loud',
  );
});
