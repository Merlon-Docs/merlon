import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { MdcpConfigSchema } from '../src/config/schema.js';

/**
 * `mdcp.config.schema.json` is maintained by hand for editor completion. The
 * zod schema in `src/config/schema.ts` is what mdcp applies at runtime, and
 * it silently drops keys it does not know, so a stale key in the JSON file
 * autocompletes an option that does nothing. This test compares the two
 * structurally. Descriptions are ignored. Defaults are compared only where the
 * JSON declares one, because it leaves out the object and array defaults that
 * zod fills in. Types, consts, enums and bounds are compared wherever either
 * side declares them, after `normalise` rewrites spellings that mean the same
 * thing in both files.
 */

interface JsonSchema {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
}

/** Names a union branch by its discriminator (`type=merge`), else by its JSON type. */
function branchKey(branch: JsonSchema): string {
  for (const [name, property] of Object.entries(branch.properties ?? {})) {
    if (property.const !== undefined) return `${name}=${String(property.const)}`;
  }
  return String(branch.type);
}

/** Flattens a schema tree into `$.guides[].source<type=merge>.parts[]`-style paths. */
function collectNodes(
  schema: JsonSchema,
  path = '$',
  nodes = new Map<string, JsonSchema>(),
): Map<string, JsonSchema> {
  nodes.set(path, schema);
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    collectNodes(property, `${path}.${name}`, nodes);
  }
  if (schema.items) collectNodes(schema.items, `${path}[]`, nodes);
  if (typeof schema.additionalProperties === 'object') {
    collectNodes(schema.additionalProperties, `${path}.*`, nodes);
  }
  for (const branch of [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]) {
    collectNodes(branch, `${path}<${branchKey(branch)}>`, nodes);
  }
  return nodes;
}

const handWritten = collectNodes(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '../mdcp.config.schema.json'), 'utf8'),
  ) as JsonSchema,
);
// `input` describes what a user writes, so a key with a zod default is optional.
const fromZod = collectNodes(
  z.toJSONSchema(MdcpConfigSchema, { io: 'input', target: 'draft-07' }) as JsonSchema,
);
const sharedPaths = [...handWritten.keys()].filter((path) => fromZod.has(path));

const TYPE_FACETS = ['type', 'const', 'enum'] as const;
const BOUND_FACETS = [
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minItems',
  'maxItems',
  'minLength',
  'maxLength',
  'pattern',
] as const;
type Facet = (typeof TYPE_FACETS)[number] | (typeof BOUND_FACETS)[number];

/**
 * Rewrites the spellings that mean the same thing: a `const` implies its type,
 * enum order does not matter, an integer `exclusiveMinimum: 0` is `minimum: 1`,
 * and zod's `maximum: Number.MAX_SAFE_INTEGER` on an integer is no bound.
 */
function normalise(node: JsonSchema): Partial<Record<Facet, unknown>> {
  const facets: Partial<Record<Facet, unknown>> = {};
  for (const facet of [...TYPE_FACETS, ...BOUND_FACETS]) {
    if (node[facet] !== undefined) facets[facet] = node[facet];
  }
  if (facets.type === undefined && node.const !== undefined) {
    facets.type = node.const === null ? 'null' : typeof node.const;
  }
  if (node.enum) {
    facets.enum = [...node.enum].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (facets.type === 'integer') {
    if (node.exclusiveMinimum !== undefined) {
      facets.minimum = node.exclusiveMinimum + 1;
      delete facets.exclusiveMinimum;
    }
    if (node.exclusiveMaximum !== undefined) {
      facets.maximum = node.exclusiveMaximum - 1;
      delete facets.exclusiveMaximum;
    }
    if (facets.minimum === Number.MIN_SAFE_INTEGER) delete facets.minimum;
    if (facets.maximum === Number.MAX_SAFE_INTEGER) delete facets.maximum;
  }
  return facets;
}

/** Lists each facet that either side declares and the two sides disagree on. */
function facetMismatches(facets: readonly Facet[]): string[] {
  return sharedPaths.flatMap((path) => {
    const json = normalise(handWritten.get(path)!);
    const zod = normalise(fromZod.get(path)!);
    return facets
      .filter((facet) => json[facet] !== undefined || zod[facet] !== undefined)
      .filter((facet) => !isDeepStrictEqual(json[facet], zod[facet]))
      .map(
        (facet) =>
          `${path} ${facet}: json=${JSON.stringify(json[facet])} zod=${JSON.stringify(zod[facet])}`,
      );
  });
}

describe('mdcp.config.schema.json matches the zod config schema', () => {
  it('walks nested objects, arrays and union branches', () => {
    for (const path of [
      '$.compileOrder[]',
      '$.guides[].source<type=merge>.parts[].fromH1Extract',
      '$.guides[].compile.hooks<object>.*',
      '$.review.maxShardWords',
    ]) {
      expect(fromZod.has(path), path).toBe(true);
    }
  });

  it('normalises zod bounds to the spelling the JSON uses', () => {
    expect(normalise(fromZod.get('$.review.maxShardWords')!)).toEqual({
      type: 'integer',
      minimum: 1,
    });
    expect(normalise(fromZod.get('$.guides[].splitLevel')!)).toEqual({
      type: 'integer',
      minimum: 1,
      maximum: 6,
    });
    expect(normalise(fromZod.get('$.guides[].source<type=merge>.type')!)).toEqual({
      type: 'string',
      const: 'merge',
    });
  });

  it('declares the same keys', () => {
    const onlyInJson = [...handWritten.keys()].filter((path) => !fromZod.has(path));
    const onlyInZod = [...fromZod.keys()].filter((path) => !handWritten.has(path));
    expect({ onlyInJson, onlyInZod }).toEqual({ onlyInJson: [], onlyInZod: [] });
  });

  it('requires the same keys', () => {
    const mismatched = sharedPaths
      .map((path) => {
        const json = [...(handWritten.get(path)!.required ?? [])].sort();
        const zod = [...(fromZod.get(path)!.required ?? [])].sort();
        return isDeepStrictEqual(json, zod) ? null : `${path}: json=${json} zod=${zod}`;
      })
      .filter((line) => line !== null);
    expect(mismatched).toEqual([]);
  });

  it('declares only the defaults zod applies', () => {
    const mismatched = sharedPaths
      .filter((path) => handWritten.get(path)!.default !== undefined)
      .map((path) => {
        const json = handWritten.get(path)!.default;
        const zod = fromZod.get(path)!.default;
        return isDeepStrictEqual(json, zod)
          ? null
          : `${path}: json=${JSON.stringify(json)} zod=${JSON.stringify(zod)}`;
      })
      .filter((line) => line !== null);
    expect(mismatched).toEqual([]);
  });

  it('declares the same type, const and enum', () => {
    expect(facetMismatches(TYPE_FACETS)).toEqual([]);
  });

  it('declares the same bounds and patterns', () => {
    expect(facetMismatches(BOUND_FACETS)).toEqual([]);
  });
});
