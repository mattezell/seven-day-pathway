/**
 * Domain types for the Seven-Day Pathway planner.
 *
 * Two kinds of data meet in this app and must never be confused:
 * a SyntheticProfile is a fictional person from the event's synthetic dataset,
 * and a Program is a real Birmingham training program read from a public page.
 * The `isSynthetic` and `registryMeta.is_synthetic` markers keep the two apart
 * everywhere they are rendered.
 */

export type BarrierKind =
  | 'schedule'
  | 'transport'
  | 'upfront_cost'
  | 'documentation'
  | 'experience';

export type RequirementKind =
  | 'eligibility'
  | 'document'
  | 'assessment'
  | 'payment';

export type FlagSeverity =
  | 'do_not_rely'
  | 'confirm_before_relying'
  | 'incomplete'
  | 'minor';

export type CohortStatus = 'already_started' | 'upcoming' | 'unknown';

/** A fictional person from economic-opportunity-profiles.csv. Never a real human. */
export interface SyntheticProfile {
  profileId: string;
  pathway: string;
  currentState: string;
  goal: string;
  constraint: string;
  opportunity: string;
  requirement: string;
  nextSevenDayAction: string;
  handoffOwnerType: string;
  requiresHumanConfirmation: boolean;
  isSynthetic: true;
}

export interface Requirement {
  id: string;
  kind: RequirementKind;
  label: string;
  source_quote?: string;
  source_url?: string;
  conditional?: boolean;
  unverified?: boolean;
}

export interface Cohort {
  cohort_id: string;
  days: string;
  time: string;
  start_date: string;
  end_date: string | null;
  status: CohortStatus;
  status_note?: string;
  data_quality_flag?: string;
}

export interface DataQualityFlag {
  id: string;
  severity: FlagSeverity;
  field: string;
  note: string;
  source_quote?: string;
  source_url?: string;
}

export interface Contact {
  role: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  url?: string;
}

export interface InPersonHelp {
  note: string;
  hours: string;
  locations: string[];
  source_quote?: string;
  source_url?: string;
}

/** A real training program, read from a public page at `fetched_at`. */
export interface Program {
  id: string;
  provider: string;
  provider_short: string;
  program_name: string;
  academy: string | null;
  program_url: string;
  schedule_url: string | null;
  leads_to: string;
  credential: string;
  credential_source_quote?: string;
  cost_usd: number | null;
  cost_source_quote?: string;
  cost_notes: string[];
  exam_fee_included?: boolean;
  exam_fee_source_quote?: string;
  format: string;
  format_source_quote?: string;
  cohorts: Cohort[];
  requirements: Requirement[];
  funding_paths: string[];
  contacts: Contact[];
  in_person_help?: InPersonHelp;
  campus?: string;
  recommendation?: 'do_not_plan_around_until_confirmed';
  data_quality_flags: DataQualityFlag[];
  fetched_at: string;
}

export interface OrderingConstraint {
  rule: string;
  why: string;
  source_quotes: string[];
}

export interface FundingPath {
  id: string;
  name: string;
  full_name: string;
  covers: string;
  determined_by: string;
  determined_by_source_quote: string;
  source_url: string;
  ordering_constraint: OrderingConstraint;
  contacts: Contact[];
  counties_served: string[];
  counties_source_quote: string;
  unknowns: string[];
  fetched_at: string;
}

export interface RegistryMeta {
  pathway: string;
  region: string;
  fetched_at: string;
  fetched_during: string;
  is_synthetic: false;
  confirmation_notice: string;
  method: string;
}

export interface ProgramRegistry {
  registry_meta: RegistryMeta;
  programs: Program[];
  funding_paths: FundingPath[];
}

/** How an option relates to one of the profile's barriers. Never a score. */
export type BarrierVerdict = 'addresses' | 'does_not_address' | 'unknown';

export interface BarrierAssessment {
  barrier: BarrierKind;
  barrierLabel: string;
  verdict: BarrierVerdict;
  why: string;
  sourceQuote?: string;
  sourceUrl?: string;
}

export interface PathwayOption {
  program: Program;
  /** Why this program is in the list at all. Stated in plain language. */
  inclusionReason: string;
  assessments: BarrierAssessment[];
  nextCohort: Cohort | null;
  blocking: boolean;
  blockingReason?: string;
}

export type StepOwner = 'the person' | 'career center' | 'training provider';

export interface PlanStep {
  order: number;
  dayWindow: string;
  title: string;
  detail: string;
  doneBy: StepOwner;
  /** The named human or office who must confirm before this step counts as done. */
  confirmedBy: string;
  confirmationQuestion: string;
  contact?: Contact;
  why: string;
  sourceQuotes: string[];
  sourceUrls: string[];
  /** True when the step exists only to resolve an unknown, not to make progress. */
  isConfirmationOnly: boolean;
}

export interface AccessCollision {
  title: string;
  detail: string;
  mitigation: string;
  sourceQuotes: string[];
}

export interface SevenDayPlan {
  profile: SyntheticProfile;
  barriers: BarrierAssessment[];
  options: PathwayOption[];
  recommendedOption: PathwayOption | null;
  steps: PlanStep[];
  collisions: AccessCollision[];
  openQuestions: string[];
  generatedFor: string;
}
