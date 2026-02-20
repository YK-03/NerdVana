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

  const candidates = [
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-pro"
  ];

  for (const modelName of candidates) {
    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const testResp = await postJson(
        testUrl,
        { contents: [{ parts: [{ text: "Hello" }] }] },
        6000
      );

      if (testResp.ok) {
        cachedWorkingModel = modelName;
        return modelName;
      }
    } catch {}
  }

  return "gemini-1.5-flash";
}

function buildPrompt(
  query: string,
  conversation: ConversationMessage[],
  spoilerMode: boolean
) {
  let activeTopic = query;

  if (conversation.length > 0) {
    const firstUserMsg = conversation.find((msg) => msg.role === "user");
    if (firstUserMsg) activeTopic = firstUserMsg.content;
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
    cachedWorkingModel = null;
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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Missing GEMINI_API_KEY in Vercel env variables" },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(query, conversation, spoilerMode);
    const answer = await generateAnswer(prompt, apiKey);
    const followups = buildFollowups(query);

    return Response.json({
      answer,
      sources: [], // non-blocking, no Whoogle freeze
      followups
    });
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