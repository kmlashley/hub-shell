import { readFile } from "fs/promises";
import path from "path";

// The Post Scorer's rubric is graded against this file, loaded fresh from
// disk (and cached in memory) rather than duplicated into a constant, so the
// doc stays the single source of truth. See next.config.js
// outputFileTracingIncludes for why this file must survive the Vercel bundle.
const VOICE_DNA_PATH = path.join(process.cwd(), "docs", "Michele_Lashley_Voice_DNA.md");

let cached: string | null = null;

export async function loadVoiceDna(): Promise<string> {
  if (cached) return cached;

  let text: string;
  try {
    text = await readFile(VOICE_DNA_PATH, "utf-8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Post Scorer cannot run: failed to read the Voice DNA source file at "${VOICE_DNA_PATH}" (${reason}). ` +
        `This file is the only source of truth for the rubric — the scorer refuses to fall back to a generic ` +
        `rubric. If this is happening in production, check that docs/Michele_Lashley_Voice_DNA.md is included in ` +
        `the deployed bundle (see outputFileTracingIncludes in next.config.js).`
    );
  }

  if (!text.trim()) {
    throw new Error(
      `Post Scorer cannot run: "${VOICE_DNA_PATH}" was found but is empty. The scorer refuses to fall back to a ` +
        `generic rubric.`
    );
  }

  cached = text;
  return cached;
}
