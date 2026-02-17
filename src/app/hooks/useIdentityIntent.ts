"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useAuth } from "./useAuth";
import { db } from "../lib/firebase";

interface IdentityIntentProfile {
  dominantItem: string | null;
  caseCount: number;
}

export function useIdentityIntent(): IdentityIntentProfile {
  const { user } = useAuth();
  const [profile, setProfile] = useState<IdentityIntentProfile>({
    dominantItem: null,
    caseCount: 0
  });

  useEffect(() => {
    if (!user) {
      setProfile({ dominantItem: null, caseCount: 0 });
      return;
    }

    const loadRecentCases = async () => {
      try {
        const recentCasesQuery = query(
          collection(db, "users", user.uid, "cases"),
          orderBy("timestamp", "desc"),
          limit(5)
        );

        const snap = await getDocs(recentCasesQuery);
        const itemCounts: Record<string, number> = {};

        snap.docs.forEach((entry) => {
          const data = entry.data() as { item?: string | null };
          const item = data.item;
          if (!item) return;
          itemCounts[item] = (itemCounts[item] || 0) + 1;
        });

        const dominantItem =
          Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        setProfile({
          dominantItem,
          caseCount: snap.docs.length
        });
      } catch {
        setProfile({ dominantItem: null, caseCount: 0 });
      }
    };

    loadRecentCases();
  }, [user]);

  return profile;
}
