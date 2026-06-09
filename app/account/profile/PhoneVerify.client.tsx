"use client";

// Vietnamese strings as const up top (full diacritics — BR-86 / phase2 gotcha #1).
const VI = {
  section: "Xác minh số điện thoại qua Zalo",
  intro:
    "Xác minh số điện thoại để nhận lại tem Magic Stamp và lịch sử bowl đã tích luỹ tại quầy.",
  verified_label: "Đã xác minh",
  verified_note: "Số điện thoại của bạn đã được xác minh qua Zalo.",
  phone_label: "Số điện thoại",
  phone_ph: "09xx xxx xxx",
  send: "Gửi mã qua Zalo",
  sending: "Đang gửi…",
  resend: "Gửi lại mã",
  code_label: "Nhập mã 6 số",
  code_ph: "______",
  verify: "Xác minh",
  verifying: "Đang xác minh…",
  change_phone: "Đổi số khác",
  sent_hint: "Đã gửi mã tới Zalo của",
  mock_hint: "(chế độ thử — xem mã trong log máy chủ)",
  ok_title: "Đã xác minh thành công!",
  linked_bowls: "bowl đã được liên kết vào tài khoản",
  linked_stamps: "tem đã được khôi phục từ các đơn cũ",
  linked_none: "Không có dữ liệu cũ nào để liên kết.",
  stamps_note:
    "Các đơn mua tại quầy trước đây đã được tính tem — từ giờ đơn mới cũng tự tích tem.",
};

const EN = {
  section: "Verify your phone via Zalo",
  intro:
    "Verify your phone to reclaim Magic Stamps and the bowl history you built up at the counter.",
  verified_label: "Verified",
  verified_note: "Your phone has been verified via Zalo.",
  phone_label: "Phone",
  phone_ph: "09xx xxx xxx",
  send: "Send code via Zalo",
  sending: "Sending…",
  resend: "Resend code",
  code_label: "Enter the 6-digit code",
  code_ph: "______",
  verify: "Verify",
  verifying: "Verifying…",
  change_phone: "Use a different number",
  sent_hint: "Code sent to the Zalo of",
  mock_hint: "(test mode — check the server log for the code)",
  ok_title: "Verified!",
  linked_bowls: "bowls linked to your account",
  linked_stamps: "stamps restored from your past orders",
  linked_none: "No past data to link.",
  stamps_note:
    "Your past counter orders have been credited — from now on new orders earn stamps automatically.",
};

import { useState } from "react";
import { maskPhone } from "@/lib/auth/phone";
import {
  requestVerifyOtpAction,
  verifyPhoneOtpAction,
} from "@/lib/auth/phone-verify";

type Lang = "en" | "vi";
type Step = "enter_phone" | "enter_code" | "verified";

/**
 * Retroactive phone-verification section (TSK-149). Three inline steps —
 * enter phone -> enter the Zalo OTP -> verified — driven by local state and the
 * phone-verify server actions (which return plain results, no redirects). On
 * success it shows the masked phone + the back-fill counts.
 */
export default function PhoneVerify({
  initialVerified,
  initialPhone,
  lang,
}: {
  initialVerified: boolean;
  initialPhone: string;
  lang: Lang;
}) {
  const s = lang === "vi" ? VI : EN;

  const [step, setStep] = useState<Step>(
    initialVerified ? "verified" : "enter_phone"
  );
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mocked, setMocked] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState(
    initialVerified && initialPhone ? maskPhone(initialPhone) : ""
  );
  const [linked, setLinked] = useState<{ bowls: number; stamps: number } | null>(
    null
  );

  const send = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await requestVerifyOtpAction(phone);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMocked(res.mocked);
      setCode("");
      setStep("enter_code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await verifyPhoneOtpAction(phone, code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMaskedPhone(res.maskedPhone);
      setLinked({ bowls: res.byoBowlsLinked, stamps: res.stampsBackfilled });
      setStep("verified");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pt-8 border-t border-kale-100 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-kale-700">{s.section}</h2>
        {step === "verified" && (
          <span className="rounded-full bg-kale-50 text-kale-700 text-xs px-2.5 py-1">
            ✓ {s.verified_label}
          </span>
        )}
      </div>

      {step !== "verified" && (
        <p className="text-xs text-kale-500">{s.intro}</p>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Step 1 — enter phone */}
      {step === "enter_phone" && (
        <div className="space-y-2">
          <label className="block text-sm text-kale-700">{s.phone_label}</label>
          <input
            name="verify_phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={s.phone_ph}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            className="bg-kale-700 text-white px-5 py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {busy ? s.sending : s.send}
          </button>
        </div>
      )}

      {/* Step 2 — enter code */}
      {step === "enter_code" && (
        <div className="space-y-2">
          <p className="text-xs text-kale-500">
            {s.sent_hint}{" "}
            <strong className="text-kale-700">{maskPhone(phone)}</strong>
            {mocked && <span className="text-kale-400"> {s.mock_hint}</span>}
          </p>
          <label className="block text-sm text-kale-700">{s.code_label}</label>
          <input
            name="verify_code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder={s.code_ph}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg tracking-[0.5em] text-center text-lg"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void verify()}
              disabled={busy || code.length < 6}
              className="bg-kale-700 text-white px-5 py-3 rounded-lg font-medium disabled:opacity-60"
            >
              {busy ? s.verifying : s.verify}
            </button>
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy}
              className="px-4 py-3 rounded-lg text-sm text-kale-600 underline disabled:opacity-60"
            >
              {s.resend}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("enter_phone");
                setError(null);
              }}
              disabled={busy}
              className="px-4 py-3 rounded-lg text-sm text-kale-500 disabled:opacity-60"
            >
              {s.change_phone}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — verified */}
      {step === "verified" && (
        <div className="rounded-xl bg-kale-50 border border-kale-100 px-4 py-3 space-y-1">
          <p className="text-sm text-kale-700 font-medium">
            ✓ {s.ok_title} {maskedPhone && <span>· {maskedPhone}</span>}
          </p>
          {linked ? (
            <p className="text-xs text-kale-600">
              {linked.bowls > 0 || linked.stamps > 0
                ? [
                    linked.stamps > 0 && `${linked.stamps} ${s.linked_stamps}`,
                    linked.bowls > 0 && `${linked.bowls} ${s.linked_bowls}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") + "."
                : s.linked_none}
            </p>
          ) : (
            <p className="text-xs text-kale-600">{s.verified_note}</p>
          )}
          <p className="text-xs text-kale-400">{s.stamps_note}</p>
        </div>
      )}
    </section>
  );
}
// trailing ASCII buffer
