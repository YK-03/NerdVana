import { useEffect, useMemo, useRef, useState } from "react";
import { generateFollowUps } from "../utils/suggestionGenerator";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ChatBubble from "../components/ChatBubble";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { type ResultLink } from "../components/ResultStack";
import { buildIntentPhrase } from "../components/QueryIntentHeader";
import { useInvestigationMemory } from "../hooks/useInvestigationMemory";
import { useIdentityIntent } from "../hooks/useIdentityIntent";
import { saveCase } from "../utils/caseStorage";
import { saveCaseCloud } from "../utils/caseCloud";
import type { MockAnswer } from "../mockAnswers";
import { resolveStaticAnswerWithAISummary } from "../staticRetriever";
import { applyIdentityStabilization, isContextValid, resolveContext } from "../itemResolver";
import { fetchSearchResults } from "../../services/searchService";
import { auth, db } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface AskPageProps {
  question: string;
  onNavigatePage: (page: string) => void;
}

interface CategorizedResults {
  canon: ResultLink[];
  theories: ResultLink[];
  spoilers: ResultLink[];
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

function readAskQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const question = params.get("q")?.trim() ?? "";
  const urlItem = params.get("item")?.trim() ?? "";
  const stateItem =
    window.history.state && typeof window.history.state.item === "string"
      ? window.history.state.item.trim()
      : "";
  const item = urlItem || stateItem;
  return {
    question,
    item
  };
}

function truncate(value: string, max = 70) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function resolveDomain(link: ResultLink) {
  if (link.source && link.source.trim()) return link.source.trim();
  try {
    return new URL(link.url).hostname;
  } catch {
    return "source";
  }
}

function resolveSourceTag(link: ResultLink) {
  const text = `${link.url} ${link.source ?? ""}`.toLowerCase();
  if (text.includes("reddit")) return "reddit";
  if (text.includes("wikipedia") || text.includes("wiki")) return "wiki";
  return "article";
}

function classifyResult(result: ResultLink) {
  const text = `${result.title ?? ""}${result.snippet ?? ""}`.toLowerCase();

  if (
    text.includes("ending explained") ||
    text.includes("official") ||
    text.includes("wiki") ||
    text.includes("lore")
  ) {
    return "canon";
  }

  if (text.includes("theory") || text.includes("reddit") || text.includes("discussion")) {
    return "theories";
  }

  if (text.includes("ending") || text.includes("spoiler")) {
    return "spoilers";
  }

  return "canon";
}

function renderResult(link: ResultLink, isSpoiler = false) {
  const domain = resolveDomain(link);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;

  return (
    <a
      key={`${link.url}-${link.title}`}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`nerdvana-clickable block border-b py-2 transition-colors duration-150 hover:text-[var(--nerdvana-accent)] ${isSpoiler ? "spoilerCard" : ""
        }`}
      style={{
        borderColor: "var(--nerdvana-border)",
        color: "var(--nerdvana-text)"
      }}
    >
      <div className="flex items-start gap-2">
        <img
          src={faviconUrl}
          alt=""
          width={16}
          height={16}
          className="mt-[1px] h-4 w-4 shrink-0"
        />
        <div className="min-w-0">
          <p
            className="text-[0.92rem] leading-5"
            style={{
              fontFamily: '"Times New Roman", serif',
              fontWeight: 700
            }}
          >
            {truncate(link.title || domain)}
          </p>
          <p
            className="text-[0.62rem] uppercase tracking-[0.12em]"
            style={{
              fontFamily: '"Courier New", monospace',
              opacity: 0.84
            }}
          >
            {domain}
          </p>
          <div className="mt-1">
            <span
              className="border px-1.5 py-[1px] text-[0.56rem] uppercase tracking-[0.08em]"
              style={{
                fontFamily: '"Courier New", monospace',
                borderColor: "var(--nerdvana-border)",
                opacity: 0.9
              }}
            >
              {resolveSourceTag(link)}
            </span>
          </div>
          <p
            className="mt-1 text-[0.82rem] leading-5"
            style={{
              fontFamily: '"Times New Roman", serif',
              opacity: 0.96,
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {truncate(link.snippet || link.title || domain, 110)}
          </p>
        </div>
      </div>
    </a>
  );
}

function CategorySection({ title, items, isSpoiler = false }: { title: string; items: ResultLink[]; isSpoiler?: boolean }) {
  return (
    <section className="category mt-4">
      <h3 className="categoryLabel text-[0.68rem] md:text-[0.72rem] uppercase">{title}</h3>
      <div className="results-list mt-2 space-y-1">{items.map((item) => renderResult(item, isSpoiler))}</div>
    </section>
  );
}

export default function AskPage({
  question,
  onNavigatePage
}: AskPageProps) {
  const { question: queryQuestion, item: queryItem } = readAskQueryParams();
  const queryFromURL = queryQuestion;
  const fullQuestion = queryFromURL || question.trim();
  const inferredContext = useMemo(
    () => resolveContext(fullQuestion, queryItem),
    [fullQuestion, queryItem]
  );
  const { dominantItem } = useIdentityIntent();
  const resolvedContext = useMemo(
    () => applyIdentityStabilization(inferredContext, dominantItem),
    [dominantItem, inferredContext]
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (inferredContext.source !== "inferred") return;

    console.log("[Identity Stabilization]", {
      inferredItem: inferredContext.item,
      dominantItem,
      finalItem: resolvedContext.item
    });
  }, [dominantItem, inferredContext.item, inferredContext.source, resolvedContext.item]);

  const resolvedItem = resolvedContext.item;
  const isAmbiguous = resolvedContext.source === "ambiguous";
  const contextIsValid = useMemo(() => isContextValid(resolvedContext), [resolvedContext]);

  const historyState = typeof window !== "undefined" ? window.history.state : {};
  const isRestored = historyState?.rehydrated === true;

  const [answer, setAnswer] = useState<MockAnswer>(
    isRestored && historyState.answer ? historyState.answer : { summary: "", categories: [], spoilers: "" }
  );
  const [results, setResults] = useState<ResultLink[]>(
    isRestored && historyState.results ? historyState.results : []
  );
  const [categorized, setCategorized] = useState<CategorizedResults>({
    canon: [],
    theories: [],
    spoilers: []
  });
  const { save: saveCaseMemory } = useInvestigationMemory();
  const [user] = useAuthState(auth);
  const lastSavedCaseKey = useRef("");
  const lastSavedQueryRef = useRef(isRestored ? fullQuestion : "");

  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(
    isRestored && historyState.historyId ? historyState.historyId : null
  );

  const [conversation, setConversation] = useState<ConversationMessage[]>(
    isRestored && historyState.conversation ? historyState.conversation : []
  );
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);

  const handleSaveLorebook = async () => {
    if (!user) {
      alert("Please sign in to save lorebooks.");
      return;
    }

    const fullSession = [];
    if (fullQuestion) fullSession.push({ role: "user", content: fullQuestion });
    if (answer.summary) fullSession.push({ role: "assistant", content: answer.summary });
    fullSession.push(...conversation);
    if (fullSession.length === 0) return;

    try {
      await addDoc(collection(db, "users", user.uid, "lorebooks"), {
        topic: fullQuestion,
        conversation: fullSession,
        results: results.map(s => ({ title: s.title, url: s.url })),
        createdAt: serverTimestamp()
      });
      alert("Session saved to Lorebooks!");
    } catch (e) {
      console.error("Error saving lorebook:", e);
      alert("Failed to save.");
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nerdvana_active_session");
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (parsed.topic === fullQuestion) {
        console.log("Restoring active session from localStorage");
        setAnswer(parsed.answer || { summary: "", categories: [], spoilers: "" });
        const restoredResults = Array.isArray(parsed.results) ? parsed.results : [];
        setResults(restoredResults);
        setCategorized(parsed.categorized || { canon: [], theories: [], spoilers: [] });
        setConversation(parsed.conversation || []);
      }
    } catch (e) {
      console.error("Failed to restore session", e);
    }
  }, []);

  useEffect(() => {
    if (!queryFromURL) return;
    console.log("[Nerdvana] Trigger search:", queryFromURL);
    void fetchSearchResults(queryFromURL).catch(() => []);
  }, [queryFromURL]);

  useEffect(() => {
    if (!fullQuestion) return;

    localStorage.setItem(
      "nerdvana_active_session",
      JSON.stringify({
        topic: fullQuestion,
        answer,
        results,
        categorized,
        conversation
      })
    );
  }, [fullQuestion, answer, results, categorized, conversation]);

  const [resultsSpoilers, setResultsSpoilers] = useState(false);
  const [chatSpoilers, setChatSpoilers] = useState(false);

  const spoilerFilter = (items: ResultLink[]) => {
    if (resultsSpoilers) return items;
    const regex = /(ending explained|dies|death|final scene|plot twist|spoiler)/i;
    return items.filter(r => !regex.test(((r.title || "") + (r.snippet || "")).toLowerCase()));
  };

  useEffect(() => {
    let isCancelled = false;
    const normalizedQuestion = fullQuestion.trim();

    setAnswer({ summary: "", categories: [], spoilers: "" });
    setResults([]);
    setCategorized({ canon: [], theories: [], spoilers: [] });

    if (!normalizedQuestion) {
      return () => {
        isCancelled = true;
      };
    }

    Promise.resolve()
      .then(async () => {
        const whoogleLinks = await fetchSearchResults(normalizedQuestion).catch(() => []);
        if (isCancelled) return null;

        const categorizedResults: CategorizedResults = {
          canon: [],
          theories: [],
          spoilers: []
        };

        whoogleLinks.forEach((r) => {
          const link: ResultLink = {
            title: r.title,
            url: r.url,
            source: r.source,
            snippet: r.snippet
          };
          categorizedResults[classifyResult(link)].push(link);
        });

        if (!contextIsValid || !resolvedItem) {
          return { resolved: null, whoogleLinks, categorized: categorizedResults };
        }

        const resolved = await resolveStaticAnswerWithAISummary(fullQuestion, resolvedItem, {
          snippets: whoogleLinks.map((link) => link.snippet).join("\n")
        });
        if (isCancelled) return null;

        return { resolved, whoogleLinks, categorized: categorizedResults };
      })
      .then(async (result) => {
        if (isCancelled || !result) return;
        const { resolved, whoogleLinks, categorized: categorizedResults } = result;

        const rawResults = whoogleLinks.map((link) => ({
          title: link.title,
          url: link.url,
          source: link.source,
          snippet: link.snippet
        }));

        setResults(rawResults);
        setCategorized(categorizedResults);
        setAnswer(resolved ?? { summary: "", categories: [], spoilers: "" });

        if (user && normalizedQuestion) {
          const historyState = window.history.state || {};
          const alreadySaved = historyState.historySaved && historyState.query === normalizedQuestion;

          if (historyState.rehydrated || alreadySaved) {
            console.log("History session already exists or restoring, skipping save.");

            if (historyState.historyId) {
              setCurrentHistoryId(historyState.historyId);
            }
            lastSavedQueryRef.current = normalizedQuestion;

            if (historyState.answer && !answer.summary) {
              setAnswer(historyState.answer);
            }
            if (historyState.conversation && conversation.length === 0) {
              setConversation(historyState.conversation);
            }

          } else {
            console.log("Creating new history session for:", user.uid, normalizedQuestion);
            const docRef = await addDoc(collection(db, "users", user.uid, "history"), {
              query: normalizedQuestion,
              conversation: [],
              results: rawResults.map((r: any) => ({ title: r.title, url: r.url })),
              createdAt: serverTimestamp()
            });

            setCurrentHistoryId(docRef.id);
            lastSavedQueryRef.current = normalizedQuestion;

            window.history.replaceState({
              ...historyState,
              historySaved: true,
              historyId: docRef.id,
              query: normalizedQuestion
            }, "");
          }
        }
      })
      .catch(() => {
        if (isCancelled) return;
        setAnswer({ summary: "", categories: [], spoilers: "" });
        setResults([]);
        setCategorized({ canon: [], theories: [], spoilers: [] });
      });

    return () => {
      isCancelled = true;
    };
  }, [contextIsValid, fullQuestion, resolvedItem, user]);


  useEffect(() => {
    if (!contextIsValid || isAmbiguous || !resolvedItem) {
      return;
    }

    if (answer.categories.length === 0) {
      return;
    }

    const caseKey = `${resolvedItem}|${fullQuestion}`;
    if (lastSavedCaseKey.current === caseKey) {
      return;
    }

    const now = Date.now();
    saveCase({
      id: `${resolvedItem}-${now}`,
      query: fullQuestion,
      item: resolvedItem,
      intent: buildIntentPhrase(fullQuestion),
      timestamp: now
    });

    saveCaseMemory({
      item: resolvedItem,
      intent: buildIntentPhrase(fullQuestion),
      timestamp: now
    });

    if (user) {
      saveCaseCloud(user.uid, {
        id: `${resolvedItem}-${now}`,
        query: fullQuestion,
        item: resolvedItem,
        intent: buildIntentPhrase(fullQuestion),
        timestamp: now
      }).catch((error) => {
        console.warn("Query cloud sync failed", error);
      });
    }

    lastSavedCaseKey.current = caseKey;
  }, [answer.categories.length, contextIsValid, fullQuestion, isAmbiguous, resolvedItem, saveCaseMemory, user]);

  const handleFollowUpSubmit = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();

    const trimmedQuery = overrideQuery ? overrideQuery.trim() : followUpQuery.trim();
    if (!trimmedQuery || isGeneratingFollowUp) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: trimmedQuery
    };
    const assistantPlaceholder: ConversationMessage = {
      role: "assistant",
      content: ""
    };

    setConversation(prev => [...prev, userMessage, assistantPlaceholder]);
    setFollowUpQuery("");
    setIsGeneratingFollowUp(true);

    let fullAssistantAnswer = "";

    try {
      const response = await fetch("/api/nerdvana-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: trimmedQuery,
          spoilerMode: chatSpoilers,
          conversation: [
            { role: "user", content: fullQuestion },
            { role: "assistant", content: answer.summary || "No answer available" },
            ...conversation
          ]
        })
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`API ${response.status}: ${details}`);
      }

      const payload = await response.json();
      fullAssistantAnswer = payload?.answer ?? "";

      const rawData = Array.isArray(payload?.sources) ? payload.sources : [];
      if (rawData.length > 0) {
        const rawResults = rawData.map((r: any) => ({
          title: r.title,
          url: r.url,
          source: r.url ? new URL(r.url).hostname : "Source",
          snippet: r.snippet
        }));

        // Keep existing search results and only append unseen sources from follow-ups.
        const seen = new Set(results.map((r) => r.url));
        const mergedResults = [...results];
        for (const result of rawResults) {
          if (!seen.has(result.url)) {
            seen.add(result.url);
            mergedResults.push(result);
          }
        }

        setResults(mergedResults);

        const newCategorized: CategorizedResults = {
          canon: [],
          theories: [],
          spoilers: []
        };
        mergedResults.forEach((link: ResultLink) => {
          newCategorized[classifyResult(link)].push(link);
        });
        setCategorized(newCategorized);
      }

      setConversation(prev => {
        const newConv = [...prev];
        newConv[newConv.length - 1] = {
          role: "assistant",
          content: fullAssistantAnswer
        };
        return newConv;
      });

    } catch (error: any) {
      console.error("Follow-up generation failed:", error);

      const errorMessage = error.message.includes("Failed to fetch")
        ? "Connection Error: Unable to reach /api/nerdvana-answer."
        : `Error: ${error.message}`;

      setConversation(prev => {
        const newConv = [...prev];
        const last = newConv[newConv.length - 1];
        if (last && last.role === "assistant") {
          last.content += `\n\n${errorMessage}`;
        } else {
          newConv.push({ role: "assistant", content: errorMessage });
        }
        return newConv;
      });
    } finally {
      setIsGeneratingFollowUp(false);

      if (user && currentHistoryId) {
        const finalConversation = [
          ...conversation,
          { role: "user", content: trimmedQuery } as ConversationMessage,
          { role: "assistant", content: fullAssistantAnswer } as ConversationMessage
        ];

        updateDoc(doc(db, "users", user.uid, "history", currentHistoryId), {
          conversation: finalConversation
        }).catch(err => console.error("Failed to update history conversation", err));
      }

    }
  };


  return (
    <div
      className="min-h-screen w-full transition-colors duration-300"
      style={{ backgroundColor: "var(--nerdvana-conversation-bg)" }}
    >
      <div className="fixed inset-0 pointer-events-none paper-texture nerdvana-paper-texture-conversation" />
      <div className="relative">
        <Header
          onNavigate={(page) => {
            onNavigatePage(page);
          }}
        />

        <main className="px-6 md:px-12 py-8 md:py-12">
          <article className="max-w-4xl mx-auto">
            <form method="get" action="/ask" className="mb-4">
              <div
                className="border-[2px] p-[2px]"
                style={{
                  borderColor: "var(--nerdvana-border)",
                  backgroundColor: "var(--nerdvana-surface)"
                }}
              >
                <input
                  name="q"
                  defaultValue={fullQuestion}
                  placeholder="Ask Nerdvana anything..."
                  className="askQueryInput w-full px-4 py-3 text-[1rem] md:text-[1.08rem] focus:outline-none"
                  style={{
                    fontFamily: '"Times New Roman", serif',
                    backgroundColor: "var(--nerdvana-surface)",
                    color: "var(--nerdvana-text)"
                  }}
                />
                {resolvedItem && <input type="hidden" name="item" value={resolvedItem} />}
              </div>
            </form>

            <div className="mb-4 flex justify-end gap-6 items-center">
              {[
                { label: "Results Spoilers", checked: resultsSpoilers, set: setResultsSpoilers },
                { label: "Conversation Spoilers", checked: chatSpoilers, set: setChatSpoilers }
              ].map((sw, idx) => (
                <label key={idx} className="nerdvana-clickable flex items-center gap-2 group select-none">
                  <span
                    className="text-[0.6rem] uppercase tracking-[0.1em]"
                    style={{
                      fontFamily: '"Courier New", monospace',
                      color: sw.checked ? "var(--nerdvana-accent)" : "var(--nerdvana-text)",
                      opacity: sw.checked ? 1 : 0.7,
                      transition: "color 0.2s"
                    }}
                  >
                    {sw.label}
                  </span>
                  <div
                    className="relative w-8 h-4 rounded-full transition-colors duration-200"
                    style={{
                      backgroundColor: sw.checked ? "var(--nerdvana-accent)" : "rgba(120,120,120,0.3)",
                      border: "1px solid var(--nerdvana-border)"
                    }}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={sw.checked}
                      onChange={(e) => sw.set(e.target.checked)}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${sw.checked ? "translate-x-4" : "translate-x-0"
                        }`}
                    />
                  </div>
                </label>
              ))}
            </div>

            {fullQuestion && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={handleSaveLorebook}
                  className="group relative px-4 py-2 border-[2px] transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    borderColor: "var(--nerdvana-border)",
                    backgroundColor: "var(--nerdvana-surface)",
                    color: "var(--nerdvana-text)"
                  }}
                >
                  <span
                    className="flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.15em]"
                    style={{ fontFamily: '"Courier New", monospace' }}
                  >
                    <span>Save</span>
                    <span>Lorebook</span>
                  </span>
                  <div
                    className="absolute inset-0 bg-[var(--nerdvana-accent)] opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                  />
                </button>
              </div>
            )}

            {spoilerFilter(categorized.canon).length > 0 && (
              <CategorySection title="CANON RECORDS" items={spoilerFilter(categorized.canon)} />
            )}
            {spoilerFilter(categorized.theories).length > 0 && (
              <CategorySection title="FAN THEORIES" items={spoilerFilter(categorized.theories)} />
            )}
            {resultsSpoilers && categorized.spoilers.length > 0 && (
              <CategorySection title="SPOILER MATERIAL" items={categorized.spoilers} isSpoiler />
            )}

            {!results.length && (
              <p
                className="mt-6 text-[0.82rem] uppercase tracking-[0.12em]"
                style={{ fontFamily: '"Courier New", monospace', opacity: 0.88, color: "var(--nerdvana-text)" }}
              >
                No web results yet.
              </p>
            )}

            {results.length > 0 && (
              <div className="mt-12 border-t-2 pt-8" style={{ borderColor: "var(--nerdvana-border)" }}>
                <form onSubmit={handleFollowUpSubmit}>
                  <div
                    className="border-[2px] p-[2px]"
                    style={{
                      borderColor: "var(--nerdvana-border)",
                      backgroundColor: "var(--nerdvana-surface)"
                    }}
                  >
                    <input
                      value={followUpQuery}
                      onChange={(e) => setFollowUpQuery(e.target.value)}
                      placeholder="Ask a follow-up about this topic..."
                      disabled={isGeneratingFollowUp}
                      className="followUpInput w-full px-4 py-3 text-[1rem] md:text-[1.08rem] focus:outline-none"
                      spellCheck={false}
                      autoComplete="off"
                      style={{
                        fontFamily: '"Times New Roman", serif',
                        backgroundColor: "var(--nerdvana-surface)",
                        color: "var(--nerdvana-text)",
                        opacity: isGeneratingFollowUp ? 0.6 : 1
                      }}
                    />
                  </div>
                  {isGeneratingFollowUp && (
                    <p
                      className="mt-2 text-[0.68rem] uppercase tracking-[0.12em]"
                      style={{ fontFamily: '"Courier New", monospace', opacity: 0.7, color: "var(--nerdvana-text)" }}
                    >
                      Generating response...
                    </p>
                  )}
                </form>
              </div>
            )}

            {conversation.length > 0 && (
              <div className="mt-6 border-t pt-6" style={{ borderColor: "var(--nerdvana-border)" }}>
                <h3
                  className="mb-4 text-[0.68rem] md:text-[0.72rem] uppercase tracking-[3px]"
                  style={{
                    fontFamily: '"Special Elite", monospace',
                    color: "var(--nerdvana-text)",
                    opacity: 0.96
                  }}
                >
                  CONVERSATION
                </h3>

                <div className="space-y-2">
                  {conversation.map((msg, index) => {
                    const suggestions =
                      msg.role === "assistant" && index === conversation.length - 1
                        ? generateFollowUps(msg.content, fullQuestion)
                        : undefined;

                    const prevMsg = index > 0 ? conversation[index - 1] : null;
                    const userQueryContext = prevMsg?.role === "user" ? prevMsg.content : "";

                    const spoilerKeywords = /\b(die|dies|death|dead|ending|kills|killed|final scene|spoiler|plot twist)\b/i;
                    const isRisky = spoilerKeywords.test(msg.content) || spoilerKeywords.test(userQueryContext);
                    const showWarning = !chatSpoilers && isRisky && msg.role === "assistant";

                    const isLast = index === conversation.length - 1;
                    const isLoading = isGeneratingFollowUp && isLast && msg.role === "assistant";

                    return (
                      <ChatBubble
                        key={index}
                        role={msg.role}
                        content={msg.content}
                        suggestions={suggestions}
                        onSuggestionClick={(s) => {
                          setFollowUpQuery(s);
                          handleFollowUpSubmit(undefined, s);
                        }}
                        warning={showWarning}
                        isLoading={isLoading}
                      />
                    );
                  })}
                </div>
              </div>
            )}

          </article>
        </main>
      </div>
      <Footer />

      <style>{`
        .paper-texture {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='6.5' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          background-repeat: repeat;
        }

        .nerdvana-paper-texture-conversation {
          opacity: 0.04;
          transition: opacity 0.3s ease;
        }

        .dark .nerdvana-paper-texture-conversation {
          opacity: 0.08;
        }

        .categoryLabel {
          font-family: "Special Elite", monospace;
          letter-spacing: 3px;
          border-top: 1px solid var(--nerdvana-border);
          margin-top: 40px;
          padding-top: 10px;
          color: var(--nerdvana-text);
          opacity: 0.96;
        }

        .spoilerCard {
          cursor: pointer;
        }

        .spoilerCard:hover {
          filter: none;
        }

        .askQueryInput::placeholder {
          color: var(--nerdvana-text);
          opacity: 0.55;
        }

        .followUpInput::placeholder {
          color: var(--nerdvana-text);
          opacity: 0.55;
        }

        .dark .askQueryInput {
          color: #f5f1e8 !important;
          background-color: #1a1918 !important;
        }

        .dark .askQueryInput::placeholder {
          color: #d9d4c8;
          opacity: 0.72;
        }

        .dark .followUpInput {
          color: #f5f1e8 !important;
          background-color: #1a1918 !important;
        }

        .dark .followUpInput::placeholder {
          color: #d9d4c8;
          opacity: 0.72;
        }
      `}</style>
    </div>
  );
}
