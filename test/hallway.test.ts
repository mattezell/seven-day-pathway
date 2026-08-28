import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseCsv } from '../src/lib/csv.ts';
import { buildPlan } from '../src/lib/planner.ts';
import {
  SITUATION_FACTS,
  buildHandoffMessage,
  buildPlainCard,
  buildScript,
  readingGrade,
} from '../src/lib/hallway.ts';
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
const program = buildPlan(byId('PROF-04'), registry).recommendedOption!.program;

test('the script is short enough to say in about ninety seconds', () => {
  const script = buildScript(program, []);
  assert.ok(script.estimatedSeconds <= 100, `too long: ${script.estimatedSeconds}s`);
  assert.ok(script.estimatedSeconds >= 25, `suspiciously short: ${script.estimatedSeconds}s`);
});

test('the script stays at or below a ninth grade reading level', () => {
  // This is the whole point of the translate step. If the copy drifts back into
  // institutional prose, this test is the thing that catches it.
  for (const facts of [[], ['money_tight'], ['works_days', 'no_car'], SITUATION_FACTS.map((f) => f.id)]) {
    const script = buildScript(program, facts);
    const text = [...script.lines, script.theAsk].join(' ');
    const grade = readingGrade(text);
    assert.ok(grade <= 9, `grade ${grade.toFixed(1)} with facts [${facts.join(',')}]`);
  }
});

test('the script always ends in exactly one ask', () => {
  const script = buildScript(program, SITUATION_FACTS.map((f) => f.id));
  assert.equal(script.theAsk.split('?').length - 1, 1, 'the close must be a single question');
  for (const line of script.lines) {
    assert.ok(!line.includes('?'), `body line should not ask a question: "${line}"`);
  }
});

test('the script never promises a seat or promises payment', () => {
  const script = buildScript(program, SITUATION_FACTS.map((f) => f.id));
  const text = [...script.lines, script.theAsk].join(' ').toLowerCase();
  assert.ok(text.includes('cannot promise'), 'the limit must be said out loud, not buried');
  for (const forbidden of ['you qualify', 'you are eligible', 'guaranteed', 'you will get in']) {
    assert.ok(!text.includes(forbidden), `script must not say "${forbidden}"`);
  }
});

test('saying they have no car surfaces the device and internet trap', () => {
  const card = buildPlainCard(program, registry, ['no_car']);
  assert.ok(
    card.whatUsuallyStopsPeople.some((s) => /computer and steady internet/i.test(s)),
    'online solves the ride but creates a device requirement, and that must be said',
  );
});

test('what usually stops people is never empty and leads with the timing trap', () => {
  const card = buildPlainCard(program, registry, []);
  assert.ok(card.whatUsuallyStopsPeople.length >= 4);
  assert.match(card.whatUsuallyStopsPeople[0], /already started/i);
});

test('the handoff message leads with the funding call, not with enrolling', () => {
  const message = buildHandoffMessage(program, registry, ['money_tight'], byId('PROF-04'));
  const doFirst = message.indexOf('DO THIS FIRST');
  const enrol = message.indexOf('Other places');
  assert.ok(doFirst > 0 && doFirst < enrol, 'the ordering rule must survive into the message');
  assert.match(message, /\(205\) 582-5200/);
  assert.match(message, /nobody has promised you a seat/i);
  assert.ok(!message.includes('undefined'));
});

test('the handoff message is readable by the person receiving it', () => {
  const message = buildHandoffMessage(program, registry, [], byId('PROF-04'));
  const prose = message
    .split('\n')
    .filter((l) => l && !l.startsWith('-') && !/^[A-Z ,]+:?$/.test(l))
    .join(' ');
  assert.ok(readingGrade(prose) <= 10, `message grade ${readingGrade(prose).toFixed(1)}`);
});

test('every situation fact points at a funding path that exists', () => {
  for (const fact of SITUATION_FACTS) {
    for (const id of fact.opensPaths) {
      assert.ok(
        registry.funding_paths.some((p) => p.id === id),
        `${fact.id} points at missing path ${id}`,
      );
    }
  }
});

test('ticking two facts never makes the script repeat itself', () => {
  const combos = [
    ['money_tight', 'works_days'],
    ['money_tight', 'works_days', 'no_car'],
    ['no_car', 'no_computer'],
    SITUATION_FACTS.map((f) => f.id),
  ];
  for (const facts of combos) {
    const { lines } = buildScript(program, facts);
    // No sentence should appear twice, and no distinctive phrase should either.
    const sentences = lines
      .join(' ')
      .split(/(?<=\.)\s+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const seen = new Set<string>();
    for (const s of sentences) {
      assert.ok(!seen.has(s), `repeated sentence with [${facts.join(',')}]: "${s}"`);
      seen.add(s);
    }
    for (const phrase of ['cover the whole thing', 'cover all of it', 'six to nine']) {
      const count = lines.join(' ').toLowerCase().split(phrase).length - 1;
      assert.ok(count <= 1, `"${phrase}" appears ${count} times with [${facts.join(',')}]`);
    }
  }
});

test('the script stays inside ninety seconds even with everything ticked', () => {
  const script = buildScript(program, SITUATION_FACTS.map((f) => f.id));
  assert.ok(script.estimatedSeconds <= 95, `${script.estimatedSeconds}s with all facts ticked`);
});
