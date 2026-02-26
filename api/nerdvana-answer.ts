type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type SourceLink = {
  title: string;
  link: string;
};

function jsonResponse(payload: unknown, status: number, res?: any) {
  if (res && typeof res.status === "function") {
    return res.status(status).json(payload);
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function readBody(req: any): Promise<any> {
  if (req && typeof req.json === "function") {
    return req.json();
  }

  if (req?.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req?.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}

function normalizeConversation(input: unknown): ConversationMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      (item): item is { role: unknown; content: unknown } =>
        Boolean(item) && typeof item === "object"
    )
    .map((item) => {
      const role: "user" | "assistant" =
        item.role === "assistant" ? "assistant" : "user";

      const content = String(item.content ?? "").trim();
      return { role, content };
    })
    .filter((item) => item.content.length > 0);
}

function buildPrompt(
  query: string,
  conversation: ConversationMessage[],
  spoilerMode: boolean
) {
  let activeTopic = query;

  if (conversation.length > 0) {
    const lastUserMsg = [...conversation]
      .reverse()
      .find((msg) => msg.role === "user");

    if (lastUserMsg) activeTopic = lastUserMsg.content;
  }

  const systemRole = `You are Nerdvana, a nerd-focused AI assistant specializing in pop culture.

ACTIVE DISCUSSION TOPIC: ${activeTopic}

IMPORTANT GUIDELINES:
- Assume follow-ups refer to ACTIVE DISCUSSION TOPIC unless user switches.
- Provide concise but informative answers (2-3 paragraphs).
- Prioritize canon facts but mention theories when relevant.
- Do not greet the user.
- Do not start with phrases like "Sure", "Great question", "Hey", "Hi", or "Hello".
- Start immediately with the answer content.
`;

  const spoilerRule = spoilerMode
    ? "Spoilers are allowed."
    : "Spoilers are NOT allowed. Give warning instead of major plot reveals.";

  const conversationContext =
    conversation.length > 0
      ? "\n\nRECENT CONVERSATION:\n" +
        conversation
          .map((msg) => `${msg.role === "user" ? "User" : "Nerdvana"}: ${msg.content}`)
          .join("\n")
      : "";

  return `${systemRole}\nSPOILER POLICY:\n${spoilerRule}${conversationContext}\n\nQUERY: ${query}\n\nANSWER:`;
}

async function generateAnswer(prompt: string, apiKey: string): Promise<string> {
  const models = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-pro-latest"
  ];

  let lastError: any = null;

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      console.log("[Nerdvana] Trying model:", model);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              maxOutputTokens: 1000,
              temperature: 0.7
            }
          }),
          signal: controller.signal
        }
      );

      const rawText = await response.text();

      console.log(`[Nerdvana] ${model} status:`, response.status);

      if (!response.ok) {
        lastError = rawText;
        console.warn(`[Nerdvana] ${model} failed → fallback`);
        continue;
      }

      const data = JSON.parse(rawText);

      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || "")
          .join("") || "";

      if (!text) {
        lastError = "Empty response";
        continue;
      }

      console.log("[Nerdvana] Success using:", model);
      return text;
    } catch (err) {
      lastError = err;
      console.warn(`[Nerdvana] ${model} crashed → fallback`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`All models failed → ${String(lastError)}`);
}

async function fetchSerperSources(query: string, apiKey: string): Promise<SourceLink[]> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: query,
      gl: "us",
      hl: "en"
    })
  });

  if (!response.ok) {
    throw new Error(`Serper failed: ${response.status}`);
  }

  const data = await response.json();
  const rows = Array.isArray(data?.organic) ? data.organic : [];

  return rows
    .map((row: any) => ({
      title: String(row?.title ?? "").trim(),
      link: String(row?.link ?? "").trim()
    }))
    .filter((row: SourceLink) => Boolean(row.title && row.link))
    .slice(0, 8);
}

async function fetchWhoogleSources(query: string, baseUrl: string): Promise<SourceLink[]> {
  const url = new URL("/search", baseUrl);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Whoogle failed: ${response.status}`);
  }

  const data = await response.json();
  const rows = Array.isArray(data?.results) ? data.results : [];

  return rows
    .map((row: any) => ({
      title: String(row?.title ?? "").trim(),
      link: String(row?.url ?? row?.href ?? "").trim()
    }))
    .filter((row: SourceLink) => Boolean(row.title && row.link))
    .slice(0, 8);
}

async function fetchSources(query: string, env: Record<string, string | undefined>) {
  const serperKey = env.SERPER_API_KEY;
  if (serperKey) {
    try {
      return await fetchSerperSources(query, serperKey);
    } catch (error) {
      console.warn("[Nerdvana] Serper source fetch failed", error);
    }
  }

  const whoogleBaseUrl = env.WHOOGLE_BASE_URL;
  if (whoogleBaseUrl) {
    try {
      return await fetchWhoogleSources(query, whoogleBaseUrl);
    } catch (error) {
      console.warn("[Nerdvana] Whoogle source fetch failed", error);
    }
  }

  return [];
}

function buildFollowups(query: string): string[] {
  return [
    `Can you explain the key events behind "${query}"?`,
    "What are the strongest fan theories related to this?",
    "Which sources are most reliable for canon details?"
  ];
}

export default async function handler(req: any, res?: any) {
  const method = String(req?.method ?? "POST").toUpperCase();

  if (method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405, res);
  }

  try {
    const body = await readBody(req);

    const query = String(body?.query ?? "").trim();
    const conversation = normalizeConversation(body?.conversation);
    const spoilerMode =
      typeof body?.spoilerMode === "boolean"
        ? body.spoilerMode
        : Boolean(body?.allowSpoilers);

    if (!query) {
      return jsonResponse({ error: "Query is required" }, 400, res);
    }

    const env =
      (
        globalThis as {
          process?: { env?: Record<string, string | undefined> };
        }
      ).process?.env ?? {};

    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return jsonResponse(
        { error: "Missing GEMINI_API_KEY in Vercel env variables" },
        500,
        res
      );
    }

    const prompt = buildPrompt(query, conversation, spoilerMode);
    const answerPromise = generateAnswer(prompt, apiKey);
    const sourcesPromise = fetchSources(query, env);

    const [answer, sources] = await Promise.all([answerPromise, sourcesPromise]);
    const followups = buildFollowups(query);

    return jsonResponse(
      {
        answer,
        sources: sources.map((source) => ({
          title: source.title,
          link: source.link
        })),
        followups
      },
      200,
      res
    );
  } catch (error) {
    console.error("Generation Failed", error);

    return jsonResponse(
      {
        error: "Generation Failed",
        details: String(error)
      },
      500,
      res
    );
  }
}
