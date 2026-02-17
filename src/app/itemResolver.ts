export const itemAliasMap: Record<string, string[]> = {
  inception: ["inception", "cobb", "spinning top", "dream", "totem"],
  interstellar: ["interstellar", "bookshelf", "cooper", "wormhole", "tesseract"],
  "jujutsu-kaisen": ["jjk", "jujutsu", "gojo", "cursed binding", "sukuna"],
  "attack-on-titan": ["attack titan", "attack on titan", "aot", "eren", "shingeki", "titan"],
  dune: ["dune", "arrakis", "paul atreides", "spice"],
  batman: ["batman", "gotham", "bruce wayne", "joker"]
};

export type ContextSource =
  | "explicit"
  | "query"
  | "inferred"
  | "identity-stabilized"
  | "ambiguous"
  | "unknown";
export type ContextConfidence = "high" | "medium" | "low";

export interface ContextCandidate {
  id: string;
  label: string;
  type: string;
  confidence: number;
}

export interface ResolvedContext {
  item: string | null;
  source: ContextSource;
  confidence: ContextConfidence;
  candidates: ContextCandidate[];
}

const GENERIC_ALIASES = new Set(["dream", "titan", "ending", "themes", "plot"]);
const ITEM_METADATA: Record<string, { label: string; type: string }> = {
  inception: { label: "Inception", type: "Movie" },
  interstellar: { label: "Interstellar", type: "Movie" },
  "jujutsu-kaisen": { label: "Jujutsu Kaisen", type: "Anime" },
  "attack-on-titan": { label: "Attack on Titan", type: "Anime" },
  dune: { label: "Dune", type: "Franchise" },
  batman: { label: "Batman", type: "Franchise" }
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countWordMatches(haystack: string, needle: string) {
  const pattern = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "g");
  return (haystack.match(pattern) ?? []).length;
}

function toTitleCaseFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function toCandidate(id: string, confidence: number): ContextCandidate {
  const metadata = ITEM_METADATA[id];
  return {
    id,
    label: metadata?.label ?? toTitleCaseFromSlug(id),
    type: metadata?.type ?? "Item",
    confidence: Number(confidence.toFixed(2))
  };
}

function scoreAliasMatch(question: string, alias: string) {
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias) return 0;

  if (normalizedAlias.includes(" ")) {
    return question.includes(normalizedAlias) ? 4 : 0;
  }

  const hits = countWordMatches(question, normalizedAlias);
  return hits > 0 ? 2 * hits : 0;
}

function computeBestAliasMatch(question: string) {
  const normalizedQuestion = normalize(question);
  const scoredCandidates: Array<{
    id: string;
    score: number;
    longestAlias: number;
    alias: string;
  }> = [];

  for (const [slug, aliases] of Object.entries(itemAliasMap)) {
    const allAliases = [slug, ...aliases];
    let totalScore = 0;
    let longestMatchedAlias = 0;
    let strongestAlias = "";

    for (const alias of allAliases) {
      const normalizedAlias = normalize(alias);
      const score = scoreAliasMatch(normalizedQuestion, alias);
      if (score <= 0) continue;

      totalScore += score;
      if (normalizedAlias.length > longestMatchedAlias) {
        longestMatchedAlias = normalizedAlias.length;
        strongestAlias = normalizedAlias;
      }
    }

    if (totalScore > 0) {
      scoredCandidates.push({
        id: slug,
        score: totalScore,
        longestAlias: longestMatchedAlias,
        alias: strongestAlias
      });
    }
  }

  if (scoredCandidates.length === 0) {
    return {
      item: null,
      score: 0,
      alias: "",
      ambiguous: false,
      candidates: [] as ContextCandidate[]
    };
  }

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.longestAlias - a.longestAlias;
  });

  const best = scoredCandidates[0];
  const topCandidateIds = scoredCandidates
    .filter((candidate) => candidate.score === best.score && candidate.longestAlias === best.longestAlias)
    .map((candidate) => candidate.id);

  const confidenceDenominator = scoredCandidates.reduce((sum, candidate) => sum + candidate.score, 0);
  const topCandidates = scoredCandidates
    .filter((candidate) => topCandidateIds.includes(candidate.id))
    .map((candidate) => toCandidate(candidate.id, confidenceDenominator > 0 ? candidate.score / confidenceDenominator : 0));

  return {
    item: best.id,
    score: best.score,
    alias: best.alias,
    ambiguous: topCandidates.length > 1,
    candidates: topCandidates
  };
}

function resolveFromQuery(question: string): ResolvedContext {
  const normalizedQuestion = normalize(question);
  if (!normalizedQuestion) {
    return {
      item: null,
      source: "unknown",
      confidence: "low",
      candidates: []
    };
  }

  const match = computeBestAliasMatch(normalizedQuestion);
  if (!match.item) {
    return {
      item: null,
      source: "unknown",
      confidence: "low",
      candidates: []
    };
  }
  if (match.ambiguous) {
    return {
      item: null,
      source: "ambiguous",
      confidence: "low",
      candidates: match.candidates
    };
  }

  const isGenericAlias = GENERIC_ALIASES.has(match.alias);
  const isHighConfidenceQuery = match.score >= 6 && !isGenericAlias;
  if (isHighConfidenceQuery) {
    return {
      item: match.item,
      source: "query",
      confidence: "high",
      candidates: []
    };
  }

  if (match.score >= 3) {
    return {
      item: match.item,
      source: "inferred",
      confidence: isGenericAlias ? "low" : "medium",
      candidates: []
    };
  }

  return {
    item: null,
    source: "unknown",
    confidence: "low",
    candidates: []
  };
}

export function resolveContext(question: string, explicitItem?: string): ResolvedContext {
  const normalizedExplicit = normalize(explicitItem ?? "");
  if (normalizedExplicit) {
    return {
      item: normalizedExplicit,
      source: "explicit",
      confidence: "high",
      candidates: []
    };
  }

  return resolveFromQuery(question);
}

export function resolveItemFromQuestion(question: string, explicitItem?: string) {
  return resolveContext(question, explicitItem).item ?? "";
}

export function isContextValid(context: ResolvedContext) {
  return context.item !== null && context.source !== "ambiguous" && context.confidence !== "low";
}

function confidenceToScore(confidence: ContextConfidence) {
  if (confidence === "high") return 0.8;
  if (confidence === "medium") return 0.6;
  return 0.3;
}

function scoreToConfidence(score: number): ContextConfidence {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export function applyIdentityStabilization(
  context: ResolvedContext,
  dominantItem: string | null
): ResolvedContext {
  if (!dominantItem) {
    return context;
  }

  if (context.source === "explicit" || context.source === "ambiguous") {
    return context;
  }

  if (context.source !== "inferred" || !context.item) {
    return context;
  }

  const inferredItem = context.item;
  const inferredConfidence = confidenceToScore(context.confidence);

  if (inferredConfidence >= 0.7) {
    return context;
  }

  if (dominantItem !== inferredItem && inferredConfidence < 0.4) {
    return context;
  }

  const stabilizedScore = Math.min(0.85, inferredConfidence + 0.1);
  return {
    ...context,
    item: dominantItem,
    source: "identity-stabilized",
    confidence: scoreToConfidence(stabilizedScore)
  };
}
