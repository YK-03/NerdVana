const SNIPPET_MAX_LENGTH = 120;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "when",
  "where",
  "why",
  "with"
]);

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function tokenizeQuery(query: string) {
  return normalize(query)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function splitSentences(text: string) {
  const matches = text.match(/[^.!?]+[.!?]?/g) ?? [];
  return matches
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function truncateSnippet(text: string, maxLength = SNIPPET_MAX_LENGTH) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function buildSnippet(text: string, query: string): string {
  const normalizedText = text.trim();
  if (!normalizedText) {
    return "";
  }

  const sentences = splitSentences(normalizedText);
  if (sentences.length === 0) {
    return truncateSnippet(normalizedText);
  }

  const keywords = tokenizeQuery(query);
  if (keywords.length > 0) {
    const keywordSentence = sentences.find((sentence) => {
      const haystack = normalize(sentence);
      return keywords.some((keyword) => haystack.includes(keyword));
    });

    if (keywordSentence) {
      return truncateSnippet(keywordSentence);
    }
  }

  const firstMeaningfulSentence = sentences.find((sentence) => /[a-z0-9]/i.test(sentence)) ?? sentences[0];
  return truncateSnippet(firstMeaningfulSentence);
}
