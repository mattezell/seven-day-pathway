import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { readNotes } from '../src/lib/listen.ts';
import { SITUATION_FACTS, buildScript, translationStatus } from '../src/lib/hallway.ts';
import type { ProgramRegistry } from '../src/types.ts';

const registry = JSON.parse(
  readFileSync(new URL('../public/data/programs.json', import.meta.url), 'utf8'),
) as ProgramRegistry;

test('the connector types what he remembers and gets the right chips', () => {
  const reading = readNotes(
    'kid wants to get into computers, works days at the warehouse, no car, mom says money is tight',
    registry,
  );
  assert.deepEqual(new Set(reading.factIds), new Set(['works_days', 'no_car', 'money_tight']));
  assert.equal(reading.programId, 'JSCC-ITHD');
});

test('every match names the words that produced it', () => {
  const notes = 'She takes the bus everywhere. Gets food stamps. Wants to fix computers.';
  const reading = readNotes(notes, registry);
  for (const heard of reading.heard) {
    assert.ok(heard.becauseTheySaid.trim().length > 0, `${heard.factId} matched without evidence`);
    assert.ok(
      notes.toLowerCase().includes(heard.becauseTheySaid.toLowerCase().slice(0, 20)),
      `${heard.factId} cited words that are not in the notes`,
    );
  }
  assert.equal(reading.programId, 'JSCC-APLUS');
});

test('it says so rather than guessing when it recognizes nothing', () => {
  const reading = readNotes('we talked for a while after the meeting', registry);
  assert.deepEqual(reading.factIds, []);
  assert.equal(reading.programId, null);
  assert.ok(reading.stillUnknown.some((q) => /which of these three/i.test(q)));
});

test('it never routes to a program a connector should not vouch for', () => {
  const everyCue = registry.programs.map((p) => p.program_name).join(' ');
  const reading = readNotes(`${everyCue} lawson innovate bootcamp cyber`, registry);
  if (reading.programId) {
    const routed = registry.programs.find((p) => p.id === reading.programId)!;
    assert.ok(translationStatus(routed).canTranslate);
  }
});

test('the device question is always raised when the notes did not settle it', () => {
  const reading = readNotes('wants an it job, money is tight', registry);
  assert.ok(reading.stillUnknown.some((q) => /computer and internet/i.test(q)));
});

test('the money question is dropped once the notes settle it', () => {
  const reading = readNotes('he gets snap, no computer at home, help desk', registry);
  assert.ok(!reading.stillUnknown.some((q) => /who pays/i.test(q)));
  assert.ok(!reading.stillUnknown.some((q) => /computer and internet/i.test(q)));
});

test('every fact the reader can emit is a fact the script knows how to use', () => {
  const known = new Set(SITUATION_FACTS.map((f) => f.id));
  const reading = readNotes(
    'no car no computer no diploma food stamps veteran disability works days money is tight help desk',
    registry,
  );
  for (const id of reading.factIds) assert.ok(known.has(id), `${id} is not a situation fact`);
  const program = registry.programs.find((p) => p.id === reading.programId)!;
  assert.ok(buildScript(program, reading.factIds), 'the reader produced facts the script rejected');
});
