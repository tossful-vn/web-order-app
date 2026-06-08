"use client";

import { useState } from "react";

type Props = {
  transactionalLabel: string;
  marketingLabel: string;
  /** Inline warning shown when the user unticks the required transactional box. */
  transactionalRequiredMsg: string;
};

/**
 * Signup consent block (TSK-143, VN PDPL 2025 readiness).
 *
 * - Transactional: pre-checked + `required` (browser blocks submit if unticked),
 *   plus an inline warning so the customer understands *why* it's mandatory.
 * - Marketing: unchecked + optional.
 *
 * Posts native checkbox values ("on" when ticked) — the server action reads
 * `consent_marketing` / `consent_transactional` and force-sets transactional
 * TRUE regardless.
 */
export default function ConsentFields({
  transactionalLabel,
  marketingLabel,
  transactionalRequiredMsg,
}: Props) {
  const [transactional, setTransactional] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <div className="space-y-3 pt-1">
      <label className="flex items-start gap-2 text-xs text-kale-600 leading-snug cursor-pointer">
        <input
          type="checkbox"
          name="consent_transactional"
          checked={transactional}
          onChange={(e) => setTransactional(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-kale-700"
        />
        <span>{transactionalLabel}</span>
      </label>
      {!transactional && (
        <p className="text-xs text-red-600 leading-snug pl-6" role="alert">
          {transactionalRequiredMsg}
        </p>
      )}

      <label className="flex items-start gap-2 text-xs text-kale-600 leading-snug cursor-pointer">
        <input
          type="checkbox"
          name="consent_marketing"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-kale-700"
        />
        <span>{marketingLabel}</span>
      </label>
    </div>
  );
}
