import { frontMatterEnd } from '../markdown/prose.js';

/** A shard's text as compile stitches it, and where that text starts in the shard file. */
export interface ShardBody {
  /** The shard without its leading YAML front matter, trimmed. */
  text: string;
  /** 1-based line of the shard file that `text` starts on. */
  firstLine: number;
}

/**
 * Compile discards a shard's leading YAML front matter: the block is data about that one file,
 * not content of the guide. Leading blank lines go too, as before.
 */
export function shardBody(fileText: string): ShardBody {
  const lines = fileText.split('\n');
  let start = frontMatterEnd(lines);
  while (start < lines.length && lines[start].trim() === '') start++;
  return { text: lines.slice(start).join('\n').trim(), firstLine: start + 1 };
}
