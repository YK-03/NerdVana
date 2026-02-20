type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

function normalizeConversation(input: unknown): ConversationMessage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter(
      (item): item is { role: unknown; content: unknown } =>
        Boolean(item) && typeof item === "object"
    )
    .map((item) => {
      const role = item.role === "assistant" ? "assistant" : "user";
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
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
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

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Gemini failed: ${response.status} ${details}`);
    }

    const data = await response.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response generated."
    );
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Gemini request timed out");
    }
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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();

    const query = String(body?.query ?? "").trim();
    const conversation = normalizeConversation(body?.conversation);
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
      sources: [],
      followups
    });
  } catch (error: unknown) {
    console.error("Generation Failed", error);
    return Response.json(
      {
        error: "Generation Failed",
        details: "Unable to generate an answer right now. Please try again."
      },
      { status: 500 }
    );
  }
}
