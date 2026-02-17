import Header from "../components/Header";

interface AboutPageProps {
  onNavigatePage: (page: string) => void;
}

export default function AboutPage({ onNavigatePage }: AboutPageProps) {
  return (
    <div
      className="min-h-screen w-full transition-colors duration-300"
      style={{ backgroundColor: "var(--nerdvana-conversation-bg)" }}
    >
      <div className="fixed inset-0 pointer-events-none paper-texture nerdvana-paper-texture-conversation" />
      <div className="relative">
        <Header onNavigate={onNavigatePage} />

        <main className="px-6 md:px-12 py-8 md:py-12">
          <article className="max-w-4xl mx-auto">
            <h1
              className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-tight uppercase"
              style={{
                fontFamily: 'Impact, "Arial Black", sans-serif',
                color: "var(--nerdvana-text)"
              }}
            >
              About Nerdvana
            </h1>

            <section
              className="mt-8 border-[2px] p-5 md:p-7 transition-colors duration-300"
              style={{
                borderColor: "var(--nerdvana-border)",
                backgroundColor: "var(--nerdvana-message-bg)"
              }}
            >
              <p
                className="text-[1rem] leading-7"
                style={{
                  fontFamily: '"Times New Roman", serif',
                  color: "var(--nerdvana-text)"
                }}
              >
                Nerdvana is an editorial question engine for story-heavy worlds. It helps people
                decode endings, themes, and canon signals by organizing answers in clear, inspectable
                buckets instead of collapsing everything into one vague paragraph.
              </p>
              <p
                className="mt-4 text-[1rem] leading-7"
                style={{
                  fontFamily: '"Times New Roman", serif',
                  color: "var(--nerdvana-text)"
                }}
              >
                Traditional search surfaces links and fragments, then leaves synthesis to the reader.
                Nerdvana is designed to structure interpretation first: evidence, intent, and common
                theories can be compared in one place without losing nuance.
              </p>

              <section
                className="mt-10 pt-6 border-t"
                style={{
                  borderColor: "var(--nerdvana-border)"
                }}
              >
                <h2
                  className="text-xs md:text-sm uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    color: "var(--nerdvana-accent)"
                  }}
                >
                  What Nerdvana Is Not
                </h2>
                <p
                  className="mt-3 text-[1rem] leading-7"
                  style={{
                    fontFamily: '"Times New Roman", serif',
                    color: "var(--nerdvana-text)"
                  }}
                >
                  It is not a replacement for source material, and it is not a platform for definitive
                  verdicts on every interpretation. The goal is clarity and context, not to flatten
                  every debate into one final answer.
                </p>
              </section>

              <section
                className="mt-10 pt-6 border-t"
                style={{
                  borderColor: "var(--nerdvana-border)"
                }}
              >
                <h2
                  className="text-xs md:text-sm uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    color: "var(--nerdvana-accent)"
                  }}
                >
                  What&apos;s Coming Next
                </h2>
                <p
                  className="mt-3 text-[1rem] leading-7"
                  style={{
                    fontFamily: '"Times New Roman", serif',
                    color: "var(--nerdvana-text)"
                  }}
                >
                  Next iterations will focus on stronger source grounding, clearer comparison views
                  between competing readings, and deeper topic coverage across films, anime, games,
                  and comics.
                </p>
              </section>
            </section>
          </article>
        </main>
      </div>

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

        .nerdvana-cursor {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3Crect x='2' y='9' width='10' height='8' rx='2' fill='%231a1918'/%3E%3Crect x='18' y='9' width='10' height='8' rx='2' fill='%231a1918'/%3E%3Crect x='12' y='11' width='6' height='4' fill='%238c1c13'/%3E%3Crect x='5' y='12' width='4' height='2' fill='%23ebe8df'/%3E%3Crect x='21' y='12' width='4' height='2' fill='%23ebe8df'/%3E%3Cpath d='M12 20 L18 20 L15 26 Z' fill='%238c1c13'/%3E%3C/svg%3E") 4 4, auto;
        }

        .dark .nerdvana-cursor {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3Crect x='2' y='9' width='10' height='8' rx='2' fill='%234a4845'/%3E%3Crect x='18' y='9' width='10' height='8' rx='2' fill='%234a4845'/%3E%3Crect x='12' y='11' width='6' height='4' fill='%23a83228'/%3E%3Crect x='5' y='12' width='4' height='2' fill='%23f5f1e8'/%3E%3Crect x='21' y='12' width='4' height='2' fill='%23f5f1e8'/%3E%3Cpath d='M12 20 L18 20 L15 26 Z' fill='%23a83228'/%3E%3C/svg%3E") 4 4, auto;
        }

        .nerdvana-cursor button,
        .nerdvana-cursor a,
        .nerdvana-cursor .nerdvana-clickable {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3Crect x='2' y='9' width='10' height='8' rx='2' fill='%238c1c13'/%3E%3Crect x='18' y='9' width='10' height='8' rx='2' fill='%238c1c13'/%3E%3Crect x='12' y='11' width='6' height='4' fill='%231a1918'/%3E%3Crect x='5' y='12' width='4' height='2' fill='%23fff8dc'/%3E%3Crect x='21' y='12' width='4' height='2' fill='%23fff8dc'/%3E%3Cpath d='M15 2 L18 9 L12 9 Z' fill='%231a1918'/%3E%3C/svg%3E") 4 4, pointer;
        }

        .dark .nerdvana-cursor button,
        .dark .nerdvana-cursor a,
        .dark .nerdvana-cursor .nerdvana-clickable {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3Crect x='2' y='9' width='10' height='8' rx='2' fill='%23a83228'/%3E%3Crect x='18' y='9' width='10' height='8' rx='2' fill='%23a83228'/%3E%3Crect x='12' y='11' width='6' height='4' fill='%234a4845'/%3E%3Crect x='5' y='12' width='4' height='2' fill='%23f5f1e8'/%3E%3Crect x='21' y='12' width='4' height='2' fill='%23f5f1e8'/%3E%3Cpath d='M15 2 L18 9 L12 9 Z' fill='%234a4845'/%3E%3C/svg%3E") 4 4, pointer;
        }
      `}</style>
    </div>
  );
}
