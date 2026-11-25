export type Provider =
  | 'ashby' | 'lever' | 'greenhouse' | 'workable' | 'recruitee' | 'teamtailor'
  | 'pinpoint' | 'smartrecruiters' | 'workday' | 'keka' | 'rippling';

export interface Job {
  jobId: string;
  company: string;
  source: Provider;
  title: string;
  location: string;
  team: string | null;
  department: string | null;
  employmentType: string | null;
  remote: boolean;
  /** Plain text; empty when the provider's list endpoint has none. */
  description: string | null;
  applyUrl: string;
  jobUrl: string;
  /** ISO 8601; scrape time when the provider gives no usable date. */
  publishedAt: string;
  scrapedAt: string;
  compensationSummary: string | null;
  compensationMin: number | null;
  compensationMax: number | null;
  compensationCurrency: string | null;
  compensationInterval: string | null;
  contentHash: string;
}

export interface FetchOptions {
  userAgent?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
}

export function getJobs(provider: Provider, slug: string, options?: FetchOptions & { company?: string }): Promise<Job[]>;
export function normalize(provider: Provider, raw: unknown[] | { jobs: unknown[] }, company?: string): Job[];
export function fetchBoard(provider: Provider, slug: string, options?: FetchOptions): Promise<{ jobs: unknown[] }>;
/** A careers-page URL to the provider and slug getJobs takes, or null if it isn't a supported board. */
export function detect(url: string): { provider: Provider; slug: string } | null;
export const PROVIDERS: Provider[];

export class FetchError extends Error {
  slug: string;
  statusCode: number | null;
  retryable: boolean;
}
