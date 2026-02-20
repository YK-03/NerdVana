type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent",
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

    console.log("Gemini status:", response.status);
    console.log("Gemini raw response:", rawText);

    if (!response.ok) {
      throw new Error(`Gemini failed → ${response.status} → ${rawText}`);
    }

    const data = JSON.parse(rawText);

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text || "")
        .join("") || "";

    if (!text) {
      throw new Error("Gemini response contained no text");
    }

    return text;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Gemini request timed out");
    }

    console.error("GENERATION ERROR FULL:", error);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return jsonResponse(
        { error: "Missing GEMINI_API_KEY in Vercel env variables" },
        500,
        res
      );
    }

    const prompt = buildPrompt(query, conversation, spoilerMode);
    const answer = await generateAnswer(prompt, apiKey);
    const followups = buildFollowups(query);

    return jsonResponse(
      {
        answer,
        sources: [],
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