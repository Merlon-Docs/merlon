/**
 * The next `-build.N` version for a build / republish bump without an API change.
 */

/** `X` → `X-build.1`, and `X-build.N` → `X-build.N+1`. Prerelease parts of `X` are kept. */
export function bumpBuild(version) {
  const match = version.match(/^(.*?)(?:-build\.(\d+))?$/);
  if (!match || !match[1]) {
    throw new Error(`Unsupported version for build bump: ${version}`);
  }
  const base = match[1];
  const n = match[2] ? Number(match[2]) + 1 : 1;
  return `${base}-build.${n}`;
}
