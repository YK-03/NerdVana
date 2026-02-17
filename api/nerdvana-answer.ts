import fs from "node:fs";
import path from "node:path";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type SourceItem = {
  title: string;
  snippet: string;
  url: string;
};

let cachedWorkingModel: string | null = null;

function readEnvValueFromFile(filePath: string, key: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const content = fs.readFileSync(filePath, "utf8");
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`^\\s*${escapedKey}\\s*=\\s*(.*)\\s*$`, "m");
    const match = content.match(regex);
    if (!match) return undefined;

    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value || undefined;
  } catch {
    return undefined;
  }
}

function resolveApiKey(): string | undefined {
  const fromProcess = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (fromProcess) return fromProcess;

  const base = process.cwd();
  const candidateFiles = [
    path.resolve(base, ".env.local"),
    path.resolve(base, ".env"),
    path.resolve(base, "../.env.local"),
    path.resolve(base, "../.env")
  ];

  for (const file of candidateFiles) {
    const direct = readEnvValueFromFile(file, "GEMINI_API_KEY");
    if (direct) return direct;
    const vitePrefixed = readEnvValueFromFile(file, "VITE_GEMINI_API_KEY");
    if (vitePrefixed) return vitePrefixed;
  }

  return undefined;
}

async function postJson(url: string, body: unknown, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function getJson(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function findWorkingModel(apiKey: string): Promise<string> {
  if (cachedWorkingModel) return cachedWorkingModel;

  const availableModels: string[] = [];
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResp = await getJson(listUrl, 3000);
    if (listResp.ok) {
      const listData = await listResp.json();
      if (Array.isArray(listData?.models)) {
        for (const model of listData.models) {
          const rawName = String(model?.name ?? "");
          const normalized = rawName.replace("models/", "");
          if (normalized.includes("gemini")) availableModels.push(normalized);
        }
      }
    }
  } catch {
    // Ignore listing failures and fall back to hardcoded candidates.
  }

  const candidates = [
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-1.0-pro",
    "gemini-pro",
    ...availableModels
  ];
  const uniqueCandidates = [...new Set(candidates)];

  for (const modelName of uniqueCandidates) {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const testResp = await postJson(
        testUrl,
        { contents: [{ parts: [{ text: "Hello" }] }] },
        8000
      );
      if (testResp.ok) {
        cachedWorkingModel = modelName;
        return modelName;
      }
    } catch {
      // Continue to next candidate.
    }
  }

  return "gemini-1.5-flash";
}

async function fetchWhoogleSources(query: string): Promise<SourceItem[]> {
  const baseUrl = process.env.VITE_WHOOGLE_URL;
  if (!baseUrl) return [];

  const searchUrl = `${baseUrl.replace(/\/+$/, "")}/search?q=${encodeURIComponent(query)}&format=json`;

  try {
    const response = await getJson(searchUrl, 5000);
    if (!response.ok) return [];

    const payload = await response.json();
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.results)
        ? payload.results
        : [];

    return rows.slice(0, 3).map((result: any) => ({
      title: result?.title || "Untitled",
      snippet: result?.snippet || result?.content || result?.description || "",
      url: result?.url || result?.link || ""
    }));
  } catch {
    return [];
  }
}

function buildPrompt(
  query: string,
  conversation: ConversationMessage[],
  spoilerMode: boolean,
  sources: SourceItem[]
) {
  let activeTopic = query;
  if (conversation.length > 0) {
    const firstUserMsg = conversation.find((msg) => msg.role === "user");
    if (firstUserMsg) activeTopic = firstUserMsg.content;
  }

  const systemRole = `You are Nerdvana, a nerd-focused AI assistant specializing in pop culture.

ACTIVE DISCUSSION TOPIC: ${activeTopic}

IMPORTANT GUIDELINES:
- You MUST assume all follow-up questions refer to the ACTIVE DISCUSSION TOPIC unless the user clearly names a different show, movie, or universe.
- If a follow-up question is short or ambiguous (e.g., 'how many seasons are there?'), interpret it in relation to the ACTIVE DISCUSSION TOPIC.
- Provide concise but informative answers (2-3 paragraphs preferred).
- Avoid single-sentence replies unless explicitly asked for a quick answer.
- Prioritize canon facts, but acknowledge popular theories.
- Cite sources where possible.
- If spoiler mode is OFF and the user asks about deaths, endings, or major plot twists, REFUSE to answer details and instead provide a spoiler warning.
`;

  const spoilerRule = spoilerMode
    ? "Spoilers are allowed. You may include major plot outcomes if relevant."
    : "Spoilers are NOT allowed. Avoid revealing deaths, endings, or final outcomes. If user explicitly asks for spoilers, provide a WARNING instead of direct spoilers.";

  const conversationContext =
    conversation.length > 0
      ? "\n\nRECENT CONVERSATION:\n" +
        conversation
          .map((msg) => `${msg.role === "user" ? "User" : "Nerdvana"}: ${msg.content}`)
          .join("\n")
      : "";

  const sourcesContext =
    sources.length > 0
      ? "\n\nSOURCES:\n" + sources.map((s, i) => `${i + 1}. ${s.title}: ${s.snippet}`).join("\n")
      : "";

  return `${systemRole}\nSPOILER POLICY:\n${spoilerRule}${conversationContext}${sourcesContext}\n\nQUERY: ${query}\n\nANSWER:`;
}

async function generateAnswer(prompt: string, apiKey: string): Promise<string> {
  const modelName = await findWorkingModel(apiKey);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await postJson(
    url,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    },
    20000
  );

  if (!response.ok) {
    if (cachedWorkingModel === modelName) {
      cachedWorkingModel = null;
    }
    const details = await response.text();
    throw new Error(`Gemini generation failed: ${response.status} ${details}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated.";
}

function buildFollowups(query: string): string[] {
  return [
    `Can you explain the key events behind "${query}"?`,
    `What are the strongest fan theories related to this?`,
    "Which sources are most reliable for canon details?"
  ];
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const query = String(body?.query ?? "").trim();
    const conversation = Array.isArray(body?.conversation) ? body.conversation : [];
    const spoilerMode =
      typeof body?.spoilerMode === "boolean"
        ? body.spoilerMode
        : Boolean(body?.allowSpoilers);

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 });
    }

    const apiKey = resolveApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "Missing GEMINI_API_KEY (or VITE_GEMINI_API_KEY for local dev)" },
        { status: 500 }
      );
    }

    const sources = await fetchWhoogleSources(query);
    const prompt = buildPrompt(query, conversation, spoilerMode, sources);
    const answer = await generateAnswer(prompt, apiKey);
    const followups = buildFollowups(query);

    return Response.json({ answer, sources, followups });
  } catch (error: any) {
    return Response.json(
      {
        error: "Generation Failed",
        details: String(error?.message ?? "Unknown error")
      },
      { status: 500 }
    );
  }
}
