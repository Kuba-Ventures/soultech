/**
 * Onboarding seed questions.
 *
 * Designed to elicit, in a 10–15 minute first session, the three things the
 * reflective chat needs to feel like you: voice (how you explain things),
 * values (what you care about / push back on), and recurring patterns (themes
 * you return to without noticing).
 *
 * Tweak freely; each item is independent. Reordering is fine but keep at least
 * one identity / one craft / one relationship question in the first six.
 */

export type SeedQuestion = {
  id: string;
  text: string;
  /** A 1–4 word tag shown above the question card. */
  tag: string;
};

export const SEED_QUESTIONS: SeedQuestion[] = [
  {
    id: "chewing",
    tag: "Current thought",
    text: "What's something you've been chewing on this week? A decision, an idea, a question you keep returning to. Go a level deeper than the headline.",
  },
  {
    id: "changed-mind",
    tag: "What changed",
    text: "Tell me about something you used to believe strongly and no longer do. What specifically tipped you?",
  },
  {
    id: "unspoken-advice",
    tag: "Held back",
    text: "What's a piece of advice you keep wanting to give people but rarely say out loud? Who's it usually for?",
  },
  {
    id: "current-craft",
    tag: "Working on",
    text: "Describe something you're working on right now (anywhere, work, life, side thing) that you don't quite know how to explain to other people yet.",
  },
  {
    id: "felt-self",
    tag: "Yourself",
    text: "When was the last time you felt fully like yourself? Walk me through what you were doing and who was around.",
  },
  {
    id: "wish-asked",
    tag: "Unasked",
    text: "What's a question you wish more people asked you? And what's the answer you'd give them?",
  },
  {
    id: "on-mind",
    tag: "On your mind",
    text: "Who's been on your mind lately, and what's the specific thing about them you keep noticing or returning to?",
  },
  {
    id: "story-you-tell",
    tag: "Self-story",
    text: "Is there a story you keep telling yourself, about your past, your work, who you are, that you suspect isn't quite right anymore?",
  },
  {
    id: "unpopular",
    tag: "Counter to your circle",
    text: "What's an opinion you hold that's quietly unpopular in your circle? Why hasn't it shifted?",
  },
  {
    id: "uninterrupted-year",
    tag: "If unconstrained",
    text: "If you had a full year of uninterrupted time and money was handled, what would you actually do with it? Not what sounds good, what you'd actually do.",
  },
];

/** Minimum member messages to mark onboarding complete-able. */
export const MIN_MESSAGES_TO_COMPLETE = 4;
