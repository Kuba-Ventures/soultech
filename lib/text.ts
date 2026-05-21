/**
 * Style steward: defensive cleanup of model output before it's saved or
 * shown. Even with explicit "no em-dashes" rules in the prompts, Claude
 * sometimes slips one in. We strip them deterministically here so the saved
 * record (and any future model context built from it) is consistently
 * em-dash-free.
 */

const EM_DASH = /—/g;
const EN_DASH = /–/g;

export function stripEmDashes(text: string): string {
  if (!text) return text;
  return text
    // Em-dash with spaces around it acts like a comma/colon: convert to comma.
    .replace(/\s*—\s*/g, ", ")
    // Bare em-dash with no surrounding spaces (rare): same treatment.
    .replace(EM_DASH, ", ")
    // En-dashes used as separators get the same treatment; they're equally
    // common in model output and look out of place outside number ranges.
    .replace(/\s+–\s+/g, ", ")
    .replace(EN_DASH, "-")
    // Collapse stray double-commas or comma-space-comma from edge cases.
    .replace(/,\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
