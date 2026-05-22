import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { DAILY_RDI } from "@/lib/types/database";

export const metadata = { title: "Tuần của tôi · Tossful" };

const DAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/**
 * Build Your Week composer — STUB.
 * Renders the 7-slot grid + RDI panel layout. Drag/drop, gap-filler,
 * and live recompute are wired in Step 3 of the brief.
 */
export default async function BywPage() {
  await requireUser();
  const supabase = createClient();

  // Latest draft week (or null if none yet).
  const { data: week } = await supabase
    .from("weeks")
    .select("id, label, status")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const filled: number = 0; // Step 3 will sum from week_slots
  const ready = filled === 7;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-1">
          Tuần của tôi
        </h1>
        <p className="text-kale-600 mb-6">
          Xếp 7 bát cho 7 ngày. Hoàn thiện cả tuần để đặt trước nguyên gói.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAYS_VI.map((d, i) => (
            <div
              key={i}
              className="aspect-square border-2 border-dashed border-kale-200 rounded-xl flex flex-col items-center justify-center text-center p-2 hover:border-kale-400 transition"
            >
              <div className="text-xs text-kale-500 mb-1">{d}</div>
              <button className="text-2xl text-kale-400">+</button>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-kale-500">
          {week
            ? `Đang chỉnh sửa: ${week.label}`
            : "Bắt đầu xếp bát — tuần mới sẽ tự tạo."}
        </p>
      </section>

      <aside className="border border-kale-100 rounded-2xl p-5 h-fit">
        <h2 className="font-display text-xl text-kale-700 mb-1">
          Dinh dưỡng tuần
        </h2>
        <p className="text-xs text-kale-500 mb-4">
          So với khuyến nghị 7 ngày × người lớn
        </p>

        <ul className="space-y-3 text-sm">
          {(
            [
              ["Calo", "kcal"],
              ["Protein", "g"],
              ["Chất béo", "g"],
              ["Tinh bột", "g"],
              ["Chất xơ", "g"],
              ["Natri", "mg"],
            ] as const
          ).map(([label, unit], i) => {
            const key = Object.keys(DAILY_RDI)[i] as keyof typeof DAILY_RDI;
            const target = DAILY_RDI[key] * 7;
            return (
              <li key={label}>
                <div className="flex justify-between text-kale-600">
                  <span>{label}</span>
                  <span className="text-kale-400">
                    0 / {target} {unit}
                  </span>
                </div>
                <div className="h-1.5 bg-kale-50 rounded-full mt-1">
                  <div className="h-full w-0 bg-kale-400 rounded-full" />
                </div>
              </li>
            );
          })}
        </ul>

        <button
          disabled={!ready}
          className="mt-6 w-full bg-kale-700 text-white py-3 rounded-lg disabled:opacity-40"
        >
          {ready ? (
            <Link href="/byw/reserve">Đặt trước tuần này</Link>
          ) : (
            `Còn ${7 - filled} ngày để chốt`
          )}
        </button>
      </aside>
    </div>
  );
}
