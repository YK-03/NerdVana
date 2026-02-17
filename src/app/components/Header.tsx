"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/firebase";
import UserDropdown from "./header/UserDropdown";

interface HeaderProps {
  onNavigate?: (page: string) => void;
}

function Header({ onNavigate }: HeaderProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState<string>("Explorer");
  const { user, login, logout } = useAuth();
  const navItems = ["Explore", "Debates", "Community", "About"];
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("nerdvana-theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);

    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    localStorage.setItem("nerdvana-theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    if (!user) {
      setUsername("Explorer");
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data() as { username?: unknown } | undefined;
        const nextUsername =
          typeof data?.username === "string" && data.username.trim()
            ? data.username.trim()
            : user.displayName || "Explorer";
        setUsername(nextUsername);
      },
      () => undefined
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!open) return;

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout().catch(() => undefined);
  };

  const navigateToPath = (path: string) => {
    setOpen(false);
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-50 w-full border-b-[3px] overflow-visible transition-colors duration-300"
      style={{
        backgroundColor: "var(--nerdvana-header-bg)",
        borderColor: "var(--nerdvana-border)",
        boxShadow: "0 6px 0 var(--nerdvana-shadow)"
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[6px] transition-colors duration-300"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--nerdvana-accent) 0px, var(--nerdvana-accent) 22px, var(--nerdvana-border) 22px, var(--nerdvana-border) 30px)"
        }}
      />
      <div className="absolute inset-0 pointer-events-none paper-texture opacity-70" />
      <div className="absolute inset-0 pointer-events-none header-vignette" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8 pt-7 pb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <motion.button
            onClick={() => onNavigate?.("home")}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            className="text-2xl md:text-[2rem] tracking-[-0.04em] uppercase transition-all duration-300 leading-none"
            style={{
              fontFamily: 'Impact, "Arial Black", sans-serif',
              color: "var(--nerdvana-text)"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--nerdvana-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--nerdvana-text)")}
          >
            NERDVANA
          </motion.button>
          <span
            className="hidden sm:inline-block px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] border-[2px] transition-colors duration-300"
            style={{
              fontFamily: '"Courier New", monospace',
              borderColor: "var(--nerdvana-border)",
              backgroundColor: "var(--nerdvana-surface)",
              color: "var(--nerdvana-text)"
            }}
          >
            Issue 2026
          </span>
        </div>

        <nav
          className="hidden md:flex items-center gap-2 p-1 border-[2px] transition-colors duration-300"
          style={{
            borderColor: "var(--nerdvana-border)",
            backgroundColor: "var(--nerdvana-surface)"
          }}
        >
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => onNavigate?.(item.toLowerCase())}
              className="px-3 py-1.5 text-[0.75rem] uppercase tracking-[0.14em] border-[1.5px] border-transparent transition-all duration-300"
              style={{
                fontFamily: '"Courier New", monospace',
                color: "var(--nerdvana-text)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--nerdvana-border)";
                e.currentTarget.style.backgroundColor = "var(--nerdvana-bg)";
                e.currentTarget.style.color = "var(--nerdvana-text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--nerdvana-text)";
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="text-[0.7rem] uppercase tracking-[0.15em] transition-all duration-300 px-3 py-1.5 border-[2px] hover:-translate-y-0.5"
            style={{
              fontFamily: '"Courier New", monospace',
              color: "var(--nerdvana-text)",
              borderColor: "var(--nerdvana-border)",
              backgroundColor: "var(--nerdvana-surface)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--nerdvana-accent)";
              e.currentTarget.style.borderColor = "var(--nerdvana-accent)";
              e.currentTarget.style.boxShadow = "1px 1px 0 var(--nerdvana-border)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--nerdvana-text)";
              e.currentTarget.style.borderColor = "var(--nerdvana-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "Dark" : "Light"}
          </button>

          {user ? (
            <>
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen((prev) => !prev);
                  }}
                  className="nerdvana-clickable flex items-center gap-2 px-2 py-1 border-[2px] transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: "var(--nerdvana-border)",
                    backgroundColor: "var(--nerdvana-surface)",
                    color: "var(--nerdvana-text)",
                    fontFamily: '"Courier New", monospace'
                  }}
                >
                  <span className="text-[0.72rem] uppercase tracking-[0.08em]">
                    {`Hi, ${username} !`}
                  </span>
                </button>
                {open && <UserDropdown onNavigate={navigateToPath} onLogout={handleLogout} />}
              </div>
            </>
          ) : (
            <button
              onClick={() => {
                login()
                  .then(() => {
                    onNavigate?.("home");
                  })
                  .catch(() => undefined);
              }}
              className="text-[0.7rem] uppercase tracking-[0.15em] transition-all duration-300 px-4 py-1.5 border-[2px] auth-button"
              style={{
                fontFamily: '"Courier New", monospace',
                color: "var(--nerdvana-surface)",
                boxShadow: "2px 2px 0 var(--nerdvana-accent)"
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      <style>{`
        .paper-texture {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='6.5' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          background-repeat: repeat;
        }

        .header-vignette {
          background: linear-gradient(90deg, rgba(235,232,223,0.28) 0%, rgba(235,232,223,0) 40%, rgba(235,232,223,0.28) 100%);
          transition: background 0.3s ease, opacity 0.3s ease;
        }

        .dark .header-vignette {
          background: linear-gradient(90deg, rgba(37,34,32,0.3) 0%, rgba(37,34,32,0) 40%, rgba(37,34,32,0.3) 100%);
        }

        .paper-texture {
          transition: opacity 0.3s ease;
        }

        .auth-button {
          background-color: var(--nerdvana-border);
          border-color: var(--nerdvana-border);
          color: var(--nerdvana-surface);
          transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
        }

        .auth-button:hover {
          background-color: var(--nerdvana-accent);
          border-color: var(--nerdvana-accent);
          transform: translateY(-1px);
        }

        .auth-button:active {
          transform: translateY(0);
        }

        .dark .auth-button {
          background-color: var(--nerdvana-accent);
          border-color: var(--nerdvana-accent);
          color: var(--nerdvana-surface);
        }

        .dark .auth-button:hover {
          background-color: var(--nerdvana-accent-hover);
          border-color: var(--nerdvana-accent-hover);
        }

        #nerdvana-user-menu img {
          border-color: var(--nerdvana-border);
        }
      `}</style>
    </motion.header>
  );
}

export default memo(Header);
