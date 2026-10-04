import type { MdcpConfig } from '@bwilliamson/mdcp-core';

/**
 * Vale `--minAlertLevel` for a run. A strict run (`mdcp prose --strict`, `mdcp check`)
 * shows alerts at `vale.strictMinAlertLevel` and above, default `error`. A non-strict
 * `mdcp prose` passes no level, so the `.vale.ini` `MinAlertLevel` applies.
 *
 * The level only changes what Vale prints. Of Vale's alerts, only error-level ones make
 * it exit non-zero (a runtime error does too), so a warning never fails either command.
 */
export function valeMinAlertLevel(config: MdcpConfig, strict: boolean): string | undefined {
  return strict ? (config.vale?.strictMinAlertLevel ?? 'error') : undefined;
}

/** Vale arguments shared by `mdcp prose` and `mdcp check`. */
export function valeArgs(config: MdcpConfig, scanPaths: string[], strict: boolean): string[] {
  const level = valeMinAlertLevel(config, strict);
  return [
    '--config',
    config.vale?.config ?? '.vale.ini',
    ...(level ? [`--minAlertLevel=${level}`] : []),
    ...scanPaths,
  ];
}
