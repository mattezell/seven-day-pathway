/**
 * Listening.
 *
 * The connector has just had the conversation. He is standing in the parking
 * lot with his thumbs, typing what he remembers: "kid wants to get into
 * computers, works at the warehouse days, no car, mom says money is tight."
 *
 * This turns that into the two decisions the hallway screen needs: which
 * program to open, and which situation facts are in play. It does not decide
 * anything about the person, does not store the text, and does not send it
 * anywhere. It runs in the browser on a string the connector typed himself.
 *
 * Every match names the words that triggered it. A connector who cannot see why
 * the tool did something has no way to catch it being wrong, and this tool is
 * going to be wrong sometimes: people do not talk in keywords.
 */
import type { Program, ProgramRegistry } from '../types.ts';
import { SITUATION_FACTS } from './hallway.ts';
import { translationStatus } from './hallway.ts';

export interface Heard {
  /** What was matched, and the words in the connector's notes that matched it. */
  factId: string;
  label: string;
  becauseTheySaid: string;
}

export interface Reading {
  factIds: string[];
  heard: Heard[];
  programId: string | null;
  programBecause: string | null;
  /** Things worth asking about that the notes did not settle. */
  stillUnknown: string[];
}

/**
 * Phrases people actually use, not the words institutions use. "Ain't got a
 * ride" has to hit, because that is what gets said.
 */
const FACT_CUES: Record<string, string[]> = {
  money_tight: [
    'money is tight', 'money tight', 'cannot afford', "can't afford", 'no money',
    'broke', 'tight on money', 'expensive', 'too much money', 'cost too much',
    'struggling', 'behind on rent', 'paycheck to paycheck',
  ],
  no_car: [
    'no car', "doesn't have a car", 'does not have a car', 'no ride', "ain't got a ride",
    'no transportation', 'takes the bus', 'rides the bus', 'no license', 'car broke down',
    'hard to get around', 'lives in huntsville', 'lives out of town', 'far out',
  ],
  no_computer: [
    'no computer', 'no laptop', 'no internet', 'no wifi', "doesn't have a computer",
    'does not have a computer', 'only has a phone', 'just has a phone', 'phone only',
  ],
  works_days: [
    'works days', 'works during the day', 'day shift', 'first shift', 'has a job',
    'working full time', 'works full time', 'at the warehouse', 'cannot miss work',
    "can't miss work", 'nine to five',
  ],
  no_diploma: [
    'no diploma', 'no ged', 'did not finish', "didn't finish", 'dropped out',
    'never graduated', 'no high school', 'working on their ged', 'occupational diploma',
  ],
  on_snap: ['snap', 'food stamps', 'ebt', 'food assistance', 'wic'],
  veteran: ['veteran', 'was in the army', 'was in the navy', 'served', 'military', 'vet'],
  disability: [
    'disability', 'disabled', 'health condition', 'bad back', 'injured', 'on ssi',
    'cannot stand', "can't stand", 'chronic',
  ],
};

/** What the person said they want, mapped to what the registry actually offers. */
const PROGRAM_CUES: Record<string, string[]> = {
  'JSCC-ITHD': [
    'help desk', 'helpdesk', 'it support', 'tech support', 'work with computers',
    'get into computers', 'computer job', 'google cert', 'it job',
  ],
  'JSCC-APLUS': [
    'fix computers', 'fixing computers', 'repair', 'hardware', 'a+', 'comptia',
    'build computers', 'take them apart',
  ],
  'JSCC-CYBER': [
    'cyber', 'security', 'hacking', 'hacker', 'infosec', 'cybersecurity',
  ],
};

function normalize(text: string): string {
  // Escaped rather than literal so this file stays pure ASCII on disk.
  return text.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');
}

/** The sentence a cue appeared in, so the connector can see the reasoning. */
function sentenceContaining(text: string, cue: string): string {
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const hit = sentences.find((s) => normalize(s).includes(cue));
  return (hit ?? text).trim().replace(/\s+/g, ' ').slice(0, 160);
}

export function readNotes(notes: string, registry: ProgramRegistry): Reading {
  const haystack = normalize(notes);
  const heard: Heard[] = [];

  for (const fact of SITUATION_FACTS) {
    const cue = (FACT_CUES[fact.id] ?? []).find((c) => haystack.includes(c));
    if (cue) {
      heard.push({ factId: fact.id, label: fact.label, becauseTheySaid: sentenceContaining(notes, cue) });
    }
  }

  let programId: string | null = null;
  let programBecause: string | null = null;
  for (const [id, cues] of Object.entries(PROGRAM_CUES)) {
    const cue = cues.find((c) => haystack.includes(c));
    if (!cue) continue;
    const candidate = registry.programs.find((p: Program) => p.id === id);
    if (!candidate || !translationStatus(candidate).canTranslate) continue;
    programId = id;
    programBecause = `They said "${cue}".`;
    break;
  }

  // The two facts that most often decide whether a pathway is survivable are
  // also the two people least often volunteer. If the notes did not settle
  // them, that is worth a question rather than an assumption.
  const factIds = heard.map((h) => h.factId);
  const stillUnknown: string[] = [];
  if (!factIds.includes('no_computer')) {
    stillUnknown.push('Do they have a computer and internet at home that holds up for three hours?');
  }
  if (!factIds.includes('money_tight') && !factIds.includes('on_snap')) {
    stillUnknown.push('Has anyone talked to them about who pays for it?');
  }
  if (!programId) {
    stillUnknown.push('Which of these three did they actually mean? Pick one above.');
  }

  return { factIds, heard, programId, programBecause, stillUnknown };
}
