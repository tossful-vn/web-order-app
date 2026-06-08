"use client";

import { useState } from "react";
import { setNewPassword } from "@/lib/auth/actions";

type Props = {
  newPh: string;
  confirmPh: string;
  save: string;
  show: string;
  hide: string;
  tooShort: string;
  mismatch: string;
};

/**
 * New-password form for the recovery flow (TSK-144). Submits to the
 * setNewPassword server action (which re-validates + calls updateUser), but
 * gives inline length + match feedback first so the user isn't bounced through
 * a server round-trip for an obvious typo.
 */
export default function ResetPasswordForm({
  newPh,
  confirmPh,
  save,
  show,
  hide,
  tooShort,
  mismatch,
}: Props) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);

  const tooShortErr = pwd.length > 0 && pwd.length < 8;
  const mismatchErr = confirm.length > 0 && pwd !== confirm;
  const canSubmit = pwd.length >= 8 && pwd === confirm;

  const inputCls =
    "w-full px-4 py-3 pr-12 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500";

  return (
    <form action={setNewPassword} className="space-y-3">
      <div className="relative">
        <input
          name="new_password"
          type={reveal ? "text" : "password"}
          required
          minLength={8}
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder={newPh}
          autoComplete="new-password"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? hide : show}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-kale-500 hover:text-kale-700"
          tabIndex={-1}
        >
          {reveal ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      <input
        name="confirm_password"
        type={reveal ? "text" : "password"}
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={confirmPh}
        autoComplete="new-password"
        className="w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
      />

      {tooShortErr && <p className="text-xs text-red-600">{tooShort}</p>}
      {mismatchErr && <p className="text-xs text-red-600">{mismatch}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {save}
      </button>
    </form>
  );
}
