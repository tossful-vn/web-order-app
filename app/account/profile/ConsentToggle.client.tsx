"use client";

// Vietnamese strings as const up top per phase2-session-lessons gotcha #1.
const VI = {
  section: "Nhận thông báo",
  txn_label: "Email giao dịch",
  txn_status: "Đã bật (cần thiết cho dịch vụ)",
  txn_note:
    "Tắt nhận thông báo giao dịch = không thể nhận xác nhận đơn hàng. Liên hệ Tossful nếu muốn xoá tài khoản.",
  mkt_label: "Email khuyến mãi",
  mkt_hint: "Khuyến mãi, voucher, sự kiện. Bật/tắt bất cứ lúc nào.",
  on: "Bật",
  off: "Tắt",
  saved_on: "Đã bật email khuyến mãi",
  saved_off: "Đã tắt email khuyến mãi",
  error: "Không lưu được, thử lại nhé.",
};

const EN = {
  section: "Communications",
  txn_label: "Transactional email",
  txn_status: "On (required for service)",
  txn_note:
    "Turning off transactional notifications means you can't receive order confirmations. Contact Tossful if you want to delete your account.",
  mkt_label: "Marketing email",
  mkt_hint: "Promotions, vouchers, events. Toggle anytime.",
  on: "On",
  off: "Off",
  saved_on: "Marketing emails on",
  saved_off: "Marketing emails off",
  error: "Could not save, please try again.",
};

import { useState } from "react";
import { setConsentMarketing } from "@/lib/profile/actions";

type Lang = "en" | "vi";

/**
 * Communications consent panel (TSK-143). Transactional is shown read-only
 * (always-on service rule); marketing is a toggle persisted immediately via
 * setConsentMarketing with an optimistic update + confirmation toast, mirroring
 * the StoreToggle (TSK-130) pattern.
 */
export default function ConsentToggle({
  initialMarketing,
  lang,
}: {
  initialMarketing: boolean;
  lang: Lang;
}) {
  const s = lang === "vi" ? VI : EN;
  const [marketing, setMarketing] = useState(initialMarketing);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const apply = async (next: boolean) => {
    if (pending || next === marketing) return;
    const previous = marketing;
    setMarketing(next); // optimistic
    setPending(true);
    try {
      await setConsentMarketing(next);
      setToast(next ? s.saved_on : s.saved_off);
    } catch {
      setMarketing(previous); // roll back on failure
      setToast(s.error);
    } finally {
      setPending(false);
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  return (
    <section className="pt-8 border-t border-kale-100">
      <h2 className="text-sm font-medium text-kale-700 mb-3">{s.section}</h2>

      {/* Transactional — read-only, always on. */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm text-kale-700">{s.txn_label}</p>
          <p className="text-xs text-kale-500 mt-1">{s.txn_note}</p>
        </div>
        <span className="shrink-0 rounded-full bg-kale-50 text-kale-700 text-xs px-3 py-1.5 whitespace-nowrap">
          {s.txn_status}
        </span>
      </div>

      {/* Marketing — toggle. */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-kale-700">{s.mkt_label}</p>
          <p className="text-xs text-kale-500 mt-1">{s.mkt_hint}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {[
            { value: true, text: s.on },
            { value: false, text: s.off },
          ].map((opt) => {
            const active = marketing === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { void apply(opt.value); }}
                disabled={pending}
                aria-pressed={active}
                className={
                  "rounded-lg border-2 px-4 py-2 text-sm transition-colors disabled:opacity-60 " +
                  (active
                    ? "border-kale-600 bg-kale-50 text-kale-800 font-medium"
                    : "border-kale-200 bg-white text-kale-600 hover:border-kale-400")
                }
              >
                {opt.text}
              </button>
            );
          })}
        </div>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 z-40 rounded-full bg-kale-800 text-cream text-xs px-4 py-2 shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </section>
  );
}
// trailing ASCII buffer
