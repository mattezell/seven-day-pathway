import { useMemo, useState } from 'react';
import type { ProgramRegistry, SevenDayPlan } from '../types';
import {
  SITUATION_FACTS,
  buildHandoffMessage,
  buildPlainCard,
  buildScript,
  readingGrade,
} from '../lib/hallway';

type Beat = 'translate' | 'say' | 'hand';

const BEATS: { id: Beat; label: string; sub: string }[] = [
  { id: 'translate', label: 'What it is', sub: 'in plain words' },
  { id: 'say', label: 'Say it', sub: '90 seconds' },
  { id: 'hand', label: 'Send it', sub: 'before you walk away' },
];

/**
 * The hallway flow. One column, big targets, three beats.
 *
 * This is the primary screen because it matches the moment: standing up, one
 * hand, ninety seconds. The longer analysis still exists behind the other tabs
 * for when there is a table and time.
 */
export default function HallwayView({
  plan,
  registry,
}: {
  plan: SevenDayPlan;
  registry: ProgramRegistry;
}) {
  const [beat, setBeat] = useState<Beat>('translate');
  const [facts, setFacts] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const option = plan.recommendedOption;

  const card = useMemo(
    () => (option ? buildPlainCard(option.program, registry, facts) : null),
    [option, registry, facts],
  );
  const script = useMemo(
    () => (option ? buildScript(option.program, facts) : null),
    [option, facts],
  );
  const message = useMemo(
    () => (option ? buildHandoffMessage(option.program, registry, facts, plan.profile) : ''),
    [option, registry, facts, plan.profile],
  );

  if (!option || !card || !script) {
    return (
      <div className="hallway">
        <section className="empty">
          <h3>Not your area, and that is the right answer.</h3>
          <p>
            This one is about <strong>{plan.profile.pathway}</strong>. Say so, and point them at a{' '}
            <strong>{plan.profile.handoffOwnerType}</strong>. Guessing costs you more than not
            knowing.
          </p>
        </section>
      </div>
    );
  }

  const toggleFact = (id: string) =>
    setFacts((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy this:', text);
    }
  };

  const scriptText = [...script.lines, script.theAsk].join(' ');
  const grade = readingGrade(scriptText);

  return (
    <div className="hallway">
      <div className="phone">
        <div className="beats">
          {BEATS.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={beat === b.id ? 'beat active' : 'beat'}
              onClick={() => setBeat(b.id)}
            >
              <span className="beat-n">{i + 1}</span>
              <span className="beat-label">{b.label}</span>
              <span className="beat-sub">{b.sub}</span>
            </button>
          ))}
        </div>

        <details className="whatyouknow">
          <summary>
            What did they tell you? <span className="chip-count">{facts.length} tapped</span>
          </summary>
          <div className="chips">
            {SITUATION_FACTS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={facts.includes(f.id) ? 'chip on' : 'chip'}
                onClick={() => toggleFact(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="chips-note">
            Nothing is saved or sent. This only changes what you say next. Do not write down a
            person's business on their behalf.
          </p>
        </details>

        {beat === 'translate' && (
          <div className="beat-body">
            <h3>What it actually is</h3>
            <dl className="plain">
              <dt>What it is</dt>
              <dd>{card.whatItIs}</dd>
              <dt>What you get</dt>
              <dd>{card.whatYouGet}</dd>
              <dt>When it meets</dt>
              <dd>{card.whenItMeets}</dd>
              <dt>What it costs</dt>
              <dd>{card.whatItCosts}</dd>
              <dt>What you need</dt>
              <dd>
                <ul>
                  {card.whatYouNeed.map((need) => (
                    <li key={need}>{need}</li>
                  ))}
                </ul>
              </dd>
            </dl>

            <h4 className="stops-head">What usually stops people</h4>
            <ul className="stops">
              {card.whatUsuallyStopsPeople.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>

            <p className="confirm-flag">
              Confirm with the program directly: <strong>{card.confirmWith}</strong>. This was looked
              up on {new Date(card.readOn).toLocaleDateString('en-US', { dateStyle: 'long' })} and it
              can change.
            </p>
          </div>
        )}

        {beat === 'say' && (
          <div className="beat-body">
            <h3>
              Read this out loud
              <span className="timer">about {script.estimatedSeconds} seconds</span>
            </h3>
            <div className="script-lines">
              {script.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="the-ask">
              <p className="ask-label">Then close. One ask, not a list.</p>
              <p className="ask-text">{script.theAsk}</p>
            </div>

            <details className="tips">
              <summary>How to ask about money and health without prying</summary>
              <ul>
                {script.askingTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </details>

            <p className="grade">
              Written to a grade {grade.toFixed(1)} reading level, and tested to stay there.
            </p>
          </div>
        )}

        {beat === 'hand' && (
          <div className="beat-body">
            <h3>Send it before you walk away</h3>
            <button type="button" className="share-button big" onClick={() => copy(message)}>
              {copied ? 'Copied. Now paste it into a message.' : 'Copy the message'}
            </button>
            <pre className="message">{message}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
