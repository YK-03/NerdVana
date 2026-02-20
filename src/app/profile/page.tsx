"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, doc, getCountFromServer, getDoc, setDoc } from "firebase/firestore";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../hooks/useAuth";
import { auth, db } from "@/firebase";

interface ProfilePageProps {
  onNavigatePage: (page: string) => void;
}

function continuityActive() {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem("nerdvana_pref_remember_context");
  return raw !== "false";
}

export default function ProfilePage({ onNavigatePage }: ProfilePageProps) {
  const [user] = useAuthState(auth);
  const { login } = useAuth();
  const [savedCount, setSavedCount] = useState(0);
  const [username, setUsername] = useState("Explorer");
  const [usernameDraft, setUsernameDraft] = useState("Explorer");
  const [savingUsername, setSavingUsername] = useState(false);
  const continuityStatus = useMemo(() => continuityActive(), []);

  useEffect(() => {
    if (!user) {
      setSavedCount(0);
      setUsername("Explorer");
      setUsernameDraft("Explorer");
      return;
    }

    getCountFromServer(collection(db, "users", user.uid, "saved"))
      .then((countSnap) => setSavedCount(countSnap.data().count))
      .catch(() => setSavedCount(0));

    const fetchUser = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const data = snap.data() as { username?: string } | undefined;
        const resolvedUsername =
          typeof data?.username === "string" && data.username.trim()
            ? data.username.trim()
            : user.displayName || "Explorer";

        setUsername(resolvedUsername);
        setUsernameDraft(resolvedUsername);
      } catch (error) {
        const fallbackName = user.displayName || "Explorer";
        setUsername(fallbackName);
        setUsernameDraft(fallbackName);
      }
    };
    fetchUser();
  }, [user]);

  const canSaveUsername = useMemo(() => {
    const trimmed = usernameDraft.trim();
    return trimmed.length > 0 && trimmed !== username;
  }, [username, usernameDraft]);

  const onSaveUsername = async () => {
    console.log("=== Saving settings started ===");

    if (!user?.uid || !canSaveUsername || savingUsername) {
      console.error("Save aborted:", {
        hasUser: !!user?.uid,
        canSave: canSaveUsername,
        alreadySaving: savingUsername
      });
      return;
    }

    // Timeout safety: Force reset after 10 seconds
    const timeoutId = setTimeout(() => {
      console.error("⚠️ TIMEOUT: Save took too long, forcing state reset");
      setSavingUsername(false);
    }, 10000);

    try {
      console.log("Setting saving state to true");
      setSavingUsername(true);

      const userRef = doc(db, "users", user.uid);
      console.log("Writing to path:", userRef.path);

      const updatedSettings = { username: usernameDraft.trim() };
      console.log("Data to save:", updatedSettings);

      await setDoc(userRef, updatedSettings, { merge: true });
      console.log("✓ Firestore write success:", updatedSettings);

      // After successful save, re-sync local state
      setUsername(updatedSettings.username);
      console.log("✓ Local state updated");
    } catch (err) {
      console.error("❌ SETTINGS SAVE ERROR:", err);
      console.error("Error details:", {
        name: (err as Error).name,
        message: (err as Error).message,
        stack: (err as Error).stack
      });
      // Log to window for visibility
      if (typeof window !== 'undefined') {
        (window as any).__lastSaveError = err;
        console.error("Error saved to window.__lastSaveError for inspection");
      }
    } finally {
      clearTimeout(timeoutId);
      setSavingUsername(false);
      console.log("=== Saving finished, state reset ===");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full transition-colors duration-300" style={{ backgroundColor: "var(--nerdvana-conversation-bg)" }}>
        <div className="fixed inset-0 pointer-events-none paper-texture nerdvana-paper-texture-conversation" />
        <div className="relative">
          <Header onNavigate={onNavigatePage} />
          <main className="px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 md:py-12">
            <section className="archive-main">
              <div className="archive-header">
                <p className="archive-label">PROFILE ARCHIVE</p>
                <p className="archive-label">ACCESS LEVEL: GUEST</p>
                <p className="archive-label">STATUS: LOCKED</p>
              </div>
              <div className="archive-modules">
                <div className="archive-module">Saved Lorebooks</div>
                <div className="archive-module">Search History</div>
                <div className="archive-module">Continuity Memory</div>
              </div>
              <button
                type="button"
                className="profileSignInBtn auth-button nerdvana-clickable"
                onClick={() => {
                  login().then(() => onNavigatePage("home")).catch((error) => console.warn("Sign in failed", error));
                }}
              >
                SIGN IN
              </button>
            </section>
          </main>
        </div>
        <Footer />
        <style>{`
          .paper-texture {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='6.5' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            background-repeat: repeat;
          }
          .nerdvana-paper-texture-conversation { opacity: 0.04; transition: opacity 0.3s ease; }
          .dark .nerdvana-paper-texture-conversation { opacity: 0.08; }
          .archive-main { max-width: min(56rem, 100%); margin: clamp(2rem, 8vw, 6rem) auto; font-family: inherit; text-align: left; }
          .archive-header { border: 1px solid var(--nerdvana-border); background: var(--nerdvana-surface); padding: clamp(0.75rem, 2.2vw, 0.9rem) clamp(0.85rem, 2.8vw, 1rem); }
          .archive-label { font-size: 0.68rem; letter-spacing: 0.16em; opacity: 0.7; text-transform: uppercase; font-family: "Courier New", monospace; color: var(--nerdvana-text); }
          .archive-label + .archive-label { margin-top: 6px; }
          .archive-modules { margin-top: 14px; display: grid; gap: 10px; }
          .archive-module { border: 1px dashed var(--nerdvana-border); background: var(--nerdvana-surface); padding: clamp(0.7rem, 2.4vw, 0.8rem) clamp(0.8rem, 2.6vw, 0.9rem); opacity: 0.6; font-family: "Times New Roman", serif; color: var(--nerdvana-text); transition: transform 180ms ease, border-color 180ms ease, opacity 180ms ease; }
          .archive-module:hover { transform: translateX(3px); border-color: var(--nerdvana-accent); opacity: 0.86; }
          .profileSignInBtn { margin-top: 16px; padding: 9px 14px; border: 2px solid var(--nerdvana-border); box-shadow: 2px 2px 0 var(--nerdvana-accent); font-size: 0.7rem; letter-spacing: 0.15em; font-family: "Courier New", monospace; text-transform: uppercase; }
          .auth-button { background-color: var(--nerdvana-border); border-color: var(--nerdvana-border); color: var(--nerdvana-surface); transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease; }
          .auth-button:hover { background-color: var(--nerdvana-accent); border-color: var(--nerdvana-accent); transform: translateY(-1px); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full transition-colors duration-300" style={{ backgroundColor: "var(--nerdvana-conversation-bg)" }}>
      <div className="fixed inset-0 pointer-events-none paper-texture nerdvana-paper-texture-conversation" />
      <div className="relative">
        <Header onNavigate={onNavigatePage} />
        <main className="px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 md:py-12">
          <article className="profile-shell max-w-3xl mx-auto border p-5 md:p-8">
            <div className="border p-4 md:p-5 flex items-center gap-4 flex-wrap" style={{ borderColor: "var(--nerdvana-border)", backgroundColor: "var(--nerdvana-surface)" }}>
              <div>
                <h1 className="text-[clamp(1.6rem,7vw,1.9rem)] md:text-3xl font-black tracking-[-0.03em] uppercase" style={{ fontFamily: 'Impact, "Arial Black", sans-serif', color: "var(--nerdvana-text)" }}>
                  {`Hi, ${username} !`}
                </h1>
                <p className="mt-1 text-[0.72rem] uppercase tracking-[0.14em]" style={{ fontFamily: '"Courier New", monospace', color: "var(--nerdvana-text)", opacity: 0.75 }}>
                  Continuity Memory: {continuityStatus ? "Active" : "Off"}
                </p>
              </div>
            </div>

            <section className="control-card mt-6 border p-4">
              <p className="text-[0.7rem] uppercase tracking-[0.14em]" style={{ fontFamily: '"Courier New", monospace', color: "var(--nerdvana-text)", opacity: 0.75 }}>
                Profile Settings
              </p>
              <label
                className="mt-3 block text-[0.66rem] uppercase tracking-[0.16em]"
                style={{ fontFamily: '"Courier New", monospace', color: "var(--nerdvana-text)", opacity: 0.8 }}
              >
                Username
              </label>
              <input
                value={usernameDraft}
                onChange={(event) => setUsernameDraft(event.target.value)}
                className="mt-2 w-full border px-3 py-2 text-[1rem] focus:outline-none"
                style={{
                  borderColor: "var(--nerdvana-border)",
                  backgroundColor: "var(--nerdvana-conversation-bg)",
                  color: "var(--nerdvana-text)",
                  fontFamily: '"Times New Roman", serif'
                }}
              />
              <button
                type="button"
                disabled={!canSaveUsername || savingUsername}
                onClick={onSaveUsername}
                className="nerdvana-clickable mt-4 border-[2px] px-3 py-2 text-[0.68rem] uppercase tracking-[0.12em] disabled:opacity-60"
                style={{ fontFamily: '"Courier New", monospace', borderColor: "var(--nerdvana-border)", color: "var(--nerdvana-text)" }}
              >
                {savingUsername ? "Saving..." : "Save Settings"}
              </button>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="control-card border p-4">
                <p className="text-[0.7rem] uppercase tracking-[0.14em]" style={{ fontFamily: '"Courier New", monospace', color: "var(--nerdvana-text)", opacity: 0.75 }}>
                  Saved Lorebooks
                </p>
                <p className="mt-2 text-3xl font-black" style={{ fontFamily: 'Impact, "Arial Black", sans-serif', color: "var(--nerdvana-text)" }}>
                  {savedCount}
                </p>
                <button
                  className="nerdvana-clickable mt-4 border-[2px] px-3 py-2 text-[0.68rem] uppercase tracking-[0.12em]"
                  style={{ fontFamily: '"Courier New", monospace', borderColor: "var(--nerdvana-border)", color: "var(--nerdvana-text)" }}
                  onClick={() => {
                    window.history.pushState({}, "", "/saved");
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                >
                  View Saved
                </button>
              </div>

              <div className="control-card border p-4">
                <p className="text-[0.7rem] uppercase tracking-[0.14em]" style={{ fontFamily: '"Courier New", monospace', color: "var(--nerdvana-text)", opacity: 0.75 }}>
                  Continuity Settings
                </p>
                <p className="mt-2 text-[0.9rem]" style={{ fontFamily: '"Times New Roman", serif', color: "var(--nerdvana-text)" }}>
                  {continuityStatus ? "Continuity memory is active." : "Continuity memory is currently off."}
                </p>
              </div>
            </section>
          </article>
        </main>
      </div>
      <Footer />
      <style>{`
        .paper-texture {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='6.5' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          background-repeat: repeat;
        }
        .nerdvana-paper-texture-conversation { opacity: 0.04; transition: opacity 0.3s ease; }
        .dark .nerdvana-paper-texture-conversation { opacity: 0.08; }
        .profile-shell {
          border-color: var(--nerdvana-border);
          background: linear-gradient(180deg, var(--nerdvana-surface) 0%, var(--nerdvana-conversation-bg) 100%);
        }
        .control-card {
          border-color: var(--nerdvana-border);
          background-color: var(--nerdvana-surface);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .control-card:hover {
          transform: translateY(-2px);
          box-shadow: 2px 2px 0 var(--nerdvana-shadow);
        }
      `}</style>
    </div>
  );
}
