import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIResponseProps {
  text: string;
  isLoading: boolean;
}

export default function AIResponse({ text, isLoading }: AIResponseProps) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    if (!text.trim()) {
      setVisibleText("");
      return;
    }

    let index = 0;
    const step = Math.max(1, Math.floor(text.length / 140));
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + step);
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 16);

    return () => window.clearInterval(timer);
  }, [text]);

  if (!isLoading && !visibleText.trim()) {
    return null;
  }

  return (
    <section className="mt-4">
      <h2
        className="text-[0.68rem] md:text-[0.72rem] uppercase tracking-[0.16em]"
        style={{
          fontFamily: '"Courier New", monospace',
          color: "var(--nerdvana-text)",
          opacity: 0.72
        }}
      >
        Answer
      </h2>
      <div
        className="mt-2 whitespace-pre-wrap text-[0.92rem] leading-7"
        style={{
          fontFamily: '"Times New Roman", serif',
          color: "var(--nerdvana-text)",
          opacity: 0.96
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
            em: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>
          }}
        >
          {visibleText}
        </ReactMarkdown>
        {isLoading && (
          <span className="ml-1 inline-block h-[1em] w-[0.45ch] animate-pulse align-[-0.1em]" style={{ backgroundColor: "var(--nerdvana-text)" }} />
        )}
      </div>
    </section>
  );
}
