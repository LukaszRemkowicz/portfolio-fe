/**
 * Copy string bindings (vars and secrets) into process.env. In production the
 * Worker's secrets (SITE_DOMAIN, SSR_API_URL, CF_ACCESS_*) did not show up in
 * process.env, which the app reads, so it fell back to localhost defaults.
 * Existing values win, so explicit local/test overrides are kept.
 */
export function exposeEnvToProcess(
  env: Record<string, unknown>,
  target: Record<string, string | undefined> = process.env
): void {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string' && target[key] === undefined) {
      target[key] = value;
    }
  }
}
