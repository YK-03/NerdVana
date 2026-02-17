"use client";

import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { CaseFile } from "./caseStorage";

export async function saveCaseCloud(uid: string, caseFile: CaseFile) {
  const ref = doc(db, "users", uid, "cases", caseFile.id);
  await setDoc(ref, caseFile);
}

export async function loadCasesCloud(uid: string): Promise<CaseFile[]> {
  const snap = await getDocs(collection(db, "users", uid, "cases"));
  return snap.docs.map((entry) => entry.data() as CaseFile);
}
