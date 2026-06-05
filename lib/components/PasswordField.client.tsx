"use client";

import { useState } from "react";

type Props = {
  name: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
  showLabel?: string;
  hideLabel?: string;
};

/**
 * Password input with a reveal toggle. Inline SVG icons so it works
 * regardless of whether the Tabler icon stylesheet is loaded.
 * Shared by /login, /signup, /reset-password (TSK-127).
 */
export default function PasswordField({
  name,
  required,
  minLength,
  placeholder,
  autoComplete = "current-password",
  className,
  showLabel = "Hien mat khau",
  hideLabel = "An mat khau",
}: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={
          className ??
          "w-full px-4 py-3 pr-12 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500"
        }
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? hideLabel : showLabel}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-kale-500 hover:text-kale-700"
        tabIndex={-1}
      >
        {show ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
