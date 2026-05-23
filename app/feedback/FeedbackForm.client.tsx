"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/lang";
import { I18N } from "../nutrition/i18n";

function feedbackSource(): string {
  if (typeof window === "undefined") return "direct";
  const allowed = ["in-store", "zalo", "facebook", "website", "direct"];
  try {
    const src = new URLSearchParams(window.location.search).get("src");
    if (src && allowed.includes(src)) return src;
  } catch {}
  return "direct";
}

export default function FeedbackForm() {
  const supabase = useMemo(() => createClient(), []);
  const [lang] = useLang();
  const str = I18N[lang];
  const [ease, setEase] = useState<string | null>(null);
  const [order, setOrder] = useState<string | null>(null);
  const [channels, setChannels] = useState<Set<string>>(new Set());
  const [confusion, setConfusion] = useState("");
  const [missing, setMissing] = useState("");
  const [other, setOther] = useState("");
  const [zalo, setZalo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toggleChannel = (v: string) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const reset = () => {
    setEase(null); setOrder(null); setChannels(new Set());
    setConfusion(""); setMissing(""); setOther(""); setZalo("");
    setErr(null); setDone(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!ease || !order) {
      setErr(str.fb_required);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: null,
        ease_score: parseInt(ease, 10),
        would_order: order,
        confusion: confusion.trim() || null,
        preferred_channels: Array.from(channels),
        missing_features: missing.trim() || null,
        other_comments: other.trim() || null,
        contact_zalo: zalo.trim() || null,
        bowl_mode: "none",
        signature_bowl: null,
        ingredients: null,
        macros: null,
        lang,
        source: feedbackSource(),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : "",
      };
      const { error: insertErr } = await supabase.from("customer_feedback").insert(payload);
      if (insertErr) throw new Error(insertErr.message);
      setDone(true);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      setErr(str.fb_error);
      console.error("feedback submit failed:", e2);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fb-thanks">
        <i className="ti ti-circle-check" />
        <h3>{str.fb_thanks_title}</h3>
        <p>{str.fb_thanks_body}</p>
        <button type="button" className="fb-thanks-again" onClick={reset}>
          {str.fb_thanks_again}
        </button>
      </div>
    );
  }

  return (
    <div className="fb-wrap">
      <div className="fb-head">
        <h2>{str.fb_title}</h2>
        <p>{str.fb_intro}</p>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="fb-q">
          <label className="fb-label">{str.fb_q_ease}</label>
          <div className="fb-scale">
            {["1","2","3","4","5"].map((v) => (
              <button type="button" key={v} className={ease === v ? "on" : ""} onClick={() => setEase(v)}>{v}</button>
            ))}
          </div>
          <div className="fb-scale-labels">
            <span>{str.fb_ease_low}</span><span>{str.fb_ease_high}</span>
          </div>
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_order}</label>
          <div className="fb-choices">
            <button type="button" className={order === "yes" ? "on" : ""} onClick={() => setOrder("yes")}>{str.fb_order_yes}</button>
            <button type="button" className={order === "maybe" ? "on" : ""} onClick={() => setOrder("maybe")}>{str.fb_order_maybe}</button>
            <button type="button" className={order === "no" ? "on" : ""} onClick={() => setOrder("no")}>{str.fb_order_no}</button>
          </div>
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_confusion}</label>
          <textarea className="fb-textarea" maxLength={500} value={confusion} onChange={(e) => setConfusion(e.target.value)} />
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_channels}</label>
          <div className="fb-multi">
            {[
              { v: "in-store", l: str.fb_ch_instore },
              { v: "zalo", l: str.fb_ch_zalo },
              { v: "website", l: str.fb_ch_website },
              { v: "facebook", l: str.fb_ch_facebook },
              { v: "other", l: str.fb_ch_other },
            ].map((opt) => (
              <button type="button" key={opt.v} className={channels.has(opt.v) ? "on" : ""} onClick={() => toggleChannel(opt.v)}>{opt.l}</button>
            ))}
          </div>
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_missing}</label>
          <textarea className="fb-textarea" maxLength={500} value={missing} onChange={(e) => setMissing(e.target.value)} />
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_other}</label>
          <textarea className="fb-textarea" maxLength={500} value={other} onChange={(e) => setOther(e.target.value)} />
        </div>

        <div className="fb-q">
          <label className="fb-label">{str.fb_q_zalo}</label>
          <input className="fb-input" type="text" maxLength={50} placeholder={str.fb_zalo_placeholder} value={zalo} onChange={(e) => setZalo(e.target.value)} />
        </div>

        <div className="fb-submit-row">
          <button type="submit" className="fb-submit" disabled={submitting}>
            {submitting ? str.fb_submitting : str.fb_submit}
          </button>
        </div>

        {err && <div className="fb-error">{err}</div>}
      </form>
    </div>
  );
}
// trailing buffer
