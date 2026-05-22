"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "tossful:pending_bowl";

/**
 * Client component mounted on /account. Runs once on mount:
 *   - reads `tossful:pending_bowl` from localStorage
 *   - if found, POSTs to /api/bowls/claim
 *   - on success, clears localStorage + refreshes the list
 *
 * The /nutrition calculator (Netlify today, in-app after Step 5) writes
 * the bowl into localStorage before redirecting an unauthenticated user
 * to /login. After magic-link, the user lands on /account and this runs.
 */
export default function GuestBowlClaim() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "claiming" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    setState("claiming");
    fetch("/api/bowls/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        window.localStorage.removeItem(STORAGE_KEY);
        setState("done");
        router.refresh();
      })
      .catch((err: Error) => {
        setState("error");
        setErrorMsg(err.message);
      });
  }, [router]);

  if (state === "idle" || state === "done") return null;

  return (
    <div
      className={`mb-6 p-4 rounded-lg text-sm ${
        state === "error"
          ? "bg-red-50 text-red-700"
          : "bg-kale-50 text-kale-700"
      }`}
      role="status"
    >
      {state === "claiming" && "Đang lưu bowl bạn vừa xây..."}
      {state === "error" &&
        `Không lưu được bowl: ${errorMsg ?? "lỗi không xác định"}`}
    </div>
  );
}
