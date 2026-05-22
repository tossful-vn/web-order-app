import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { SavedBowl } from "@/lib/types/database";
import GuestBowlClaim from "./guest-bowl-claim";

export const metadata = { title: "Bowl của bạn · Tossful" };

export default async function AccountPage() {
  const supabase = createClient();
  const { data: bowls } = await supabase
    .from("saved_bowls")
    .select("id, name, kcal, protein_g, fibre_g, created_at")
    .order("created_at", { ascending: false })
    .limit(40);

  const list = (bowls ?? []) as Pick<
    SavedBowl,
    "id" | "name" | "kcal" | "protein_g" | "fibre_g" | "created_at"
  >[];

  return (
    <div className="space-y-8">
      {/* Mount the claim hook — silent unless there's a pending bowl */}
      <GuestBowlClaim />

      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2">
          Bowl của bạn
        </h1>
        <p className="text-kale-600">
          Mỗi bowl bạn xây trong máy tính dinh dưỡng đều được lưu ở đây — sẵn
          sàng để xếp vào{" "}
          <Link href="/byw" className="underline">
            Tuần của tôi
          </Link>
          .
        </p>
      </section>

      {list.length === 0 ? (
        <div className="border border-dashed border-kale-200 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🥗</div>
          <p className="text-kale-700 font-medium mb-1">
            Bạn chưa lưu bowl nào.
          </p>
          <p className="text-sm text-kale-500 mb-5">
            Xây bowl đầu tiên rồi bấm "Lưu" — sau đó quay lại đây để xếp tuần.
          </p>
          <Link
            href="/nutrition"
            className="inline-block bg-kale-700 text-white px-5 py-3 rounded-lg hover:bg-kale-800 transition"
          >
            Mở máy tính dinh dưỡng
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((b) => (
            <li key={b.id}>
              <Link
                href={`/account/bowls/${b.id}`}
                className="block border border-kale-100 rounded-xl p-4 hover:border-kale-300 hover:shadow-sm transition h-full"
              >
                <div className="font-medium text-kale-700 mb-2 line-clamp-1">
                  {b.name}
                </div>
                <div className="flex gap-3 text-xs text-kale-500">
                  <span>
                    {b.kcal != null
                      ? `${Math.round(Number(b.kcal))} kcal`
                      : "— kcal"}
                  </span>
                  <span>
                    {b.protein_g != null
                      ? `${Math.round(Number(b.protein_g))}g đạm`
                      : "— đạm"}
                  </span>
                  <span>
                    {b.fibre_g != null
                      ? `${Math.round(Number(b.fibre_g))}g xơ`
                      : "— xơ"}
                  </span>
                </div>
                <div className="text-xs text-kale-400 mt-3">
                  {new Date(b.created_at).toLocaleDateString("vi-VN")}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
