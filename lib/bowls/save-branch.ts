/**
 * Save-bowl auth branch for the /nutrition calculator (TSK-169, Option C).
 *
 * Pulled out of Calculator.client.tsx so the logged-in-vs-anonymous decision is
 * unit-testable without a DOM:
 *   • logged-in  → write to saved_bowls (real DB save), then confirm
 *   • anonymous  → NO DB write; open the screenshot popup + loyalty on-ramp
 *
 * All side effects are injected, so a test can assert exactly which path ran.
 */

export type SaveAuthKind = "logged_in" | "anonymous";

export type SaveBowlOrchestratorDeps<P> = {
  /** Resolve the current user, or null when anonymous. */
  getUser: () => Promise<{ id: string } | null>;
  /** Server action that writes to saved_bowls. Only called when logged-in. */
  saveBowl: (payload: P) => Promise<{ id: string } | { error: string }>;
  /** Fired once with the resolved auth kind (analytics: save-bowl click). */
  onClick?: (auth: SaveAuthKind) => void;
  /** Toggle a saving spinner around the DB write. */
  onSaving?: (saving: boolean) => void;
  /** DB save succeeded — id is the new saved_bowls row. */
  onSaved: (id: string) => void;
  /** DB save failed. */
  onError: (message: string) => void;
  /** Anonymous path — show the screenshot popup + on-ramp. NO DB write. */
  onAnonymous: () => void;
};

/**
 * Run the save branch. Returns nothing; communicates exclusively through the
 * injected callbacks. saveBowl is NEVER invoked on the anonymous path.
 */
export async function runSaveBowl<P>(
  payload: P,
  deps: SaveBowlOrchestratorDeps<P>,
): Promise<void> {
  const user = await deps.getUser();
  deps.onClick?.(user ? "logged_in" : "anonymous");

  if (user) {
    deps.onSaving?.(true);
    const result = await deps.saveBowl(payload);
    deps.onSaving?.(false);
    if ("error" in result) {
      deps.onError(result.error);
      return;
    }
    deps.onSaved(result.id);
    return;
  }

  // Anonymous: deliberately do NOT call saveBowl.
  deps.onAnonymous();
}
