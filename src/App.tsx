import { useEffect, useMemo, useState } from 'react';
import type { ProgramRegistry, SyntheticProfile } from './types';
import { loadProfiles, loadRegistry } from './lib/load';
import { buildPlan } from './lib/planner';
import PlanView from './components/PlanView';
import NavigatorView from './components/NavigatorView';
import './App.css';

/** Demo presets live in the URL hash so each step of a demo is one clickable link. */
function readHash(): string {
  return window.location.hash.replace(/^#/, '') || 'PROF-04';
}

export default function App() {
  const [profiles, setProfiles] = useState<SyntheticProfile[] | null>(null);
  const [registry, setRegistry] = useState<ProgramRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<string>(readHash());

  useEffect(() => {
    Promise.all([loadProfiles(), loadRegistry()])
      .then(([p, r]) => {
        setProfiles(p);
        setRegistry(r);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const plan = useMemo(() => {
    if (!profiles || !registry || view === 'navigator') return null;
    const profile = profiles.find((p) => p.profileId === view) ?? profiles[0];
    return profile ? buildPlan(profile, registry) : null;
  }, [profiles, registry, view]);

  if (error) {
    return (
      <main className="shell">
        <div className="error">
          <h1>Could not load the data</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!profiles || !registry) {
    return (
      <main className="shell">
        <p className="loading">Loading synthetic profiles and the program registry...</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="masthead">
        <div>
          <h1>Seven-Day Pathway</h1>
          <p className="tagline">
            Technology reskilling in Birmingham: what a person can actually finish in the next seven
            days, and who has to confirm each piece.
          </p>
        </div>
        <div className="legend">
          <span className="badge badge-synthetic">Synthetic person</span>
          <span className="badge badge-real">Real program, read {new Date(registry.registry_meta.fetched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </header>

      <p className="standfirst">
        This tool does not decide anything. It turns public program pages into a sequence a person can
        act on this week, and every line carries the source it came from and the named human who must
        confirm it.
      </p>

      <nav className="picker">
        {profiles.map((p) => (
          <a
            key={p.profileId}
            href={`#${p.profileId}`}
            className={view === p.profileId ? 'active' : ''}
            title={p.goal}
          >
            {p.profileId}
            <span className="picker-sub">{p.pathway}</span>
          </a>
        ))}
        <a href="#navigator" className={view === 'navigator' ? 'active nav-view' : 'nav-view'}>
          Navigator view
          <span className="picker-sub">all {profiles.length} profiles</span>
        </a>
      </nav>

      {view === 'navigator' ? (
        <NavigatorView profiles={profiles} registry={registry} />
      ) : plan ? (
        <PlanView plan={plan} />
      ) : null}

      <footer className="colophon">
        <p>
          <strong>Nothing here is a confirmation.</strong> {registry.registry_meta.confirmation_notice}
        </p>
        <p>
          <strong>How the registry was built.</strong> {registry.registry_meta.method}
        </p>
        <p>
          Built at the Birmingham Claude Impact Lab, August 28, 2026. Synthetic profiles come from the
          event's own dataset. Prior research on Jefferson County's 34 municipal governments is
          published separately at{' '}
          <a href="https://onecounty.thenewguard.ai" target="_blank" rel="noreferrer">
            onecounty.thenewguard.ai
          </a>{' '}
          and is cited here as background only; no code or data from it appears in this project.
        </p>
      </footer>
    </main>
  );
}
