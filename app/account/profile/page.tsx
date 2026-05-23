import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/profile/actions";
import { getServerLang } from "@/lib/lang-server";
import type { Profile } from "@/lib/types/database";

const STRINGS = {
  en: {
    metadata: "Profile · Tossful",
    title: "Profile",
    intro: "This information helps Tossful confirm your pre-orders.",
    name_label: "Display name",
    name_ph: "e.g. Hieu",
    phone_label: "Phone",
    phone_ph: "09xx xxx xxx",
    phone_note: "Tossful only texts to confirm orders — no marketing.",
    store_label: "Preferred store",
    store_hn: "Hanoi",
    store_sg: "Saigon",
    save: "Save changes",
    signed_in_pre: "Signed in as:",
  },
  vi: {
    metadata: "Hồ sơ · Tossful",
    title: "Hồ sơ",
    intro: "Thông tin này giúp Tossful xác nhận đơn đặt trước của bạn.",
    name_label: "Tên hiển thị",
    name_ph: "VD: Hiếu",
    phone_label: "Số điện thoại",
    phone_ph: "09xx xxx xxx",
    phone_note: "Tossful chỉ nhắn để xác nhận đơn — không quảng cáo.",
    store_label: "Cửa hàng quen",
    store_hn: "Hà Nội",
    store_sg: "Sài Gòn",
    save: "Lưu thay đổi",
    signed_in_pre: "Đăng nhập với:",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default async function ProfilePage() {
  const s = STRINGS[getServerLang()];
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle();
  const p = (profile ?? {}) as Partial<Profile>;

  return (
    <div className="max-w-lg space-y-8 p-6 mx-auto w-full">
      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2">{s.title}</h1>
        <p className="text-kale-600">{s.intro}</p>
      </section>

      <form action={updateProfile} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">{s.name_label}</label>
          <input
            name="display_name"
            defaultValue={p.display_name ?? ""}
            placeholder={s.name_ph}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">{s.phone_label}</label>
          <input
            name="contact_phone"
            type="tel"
            defaultValue={p.contact_phone ?? ""}
            placeholder={s.phone_ph}
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
          <p className="text-xs text-kale-500 mt-1">{s.phone_note}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-kale-700 mb-2">{s.store_label}</label>
          <div className="grid grid-cols-2 gap-3">
            {(["HN", "SG"] as const).map((st) => (
              <label key={st} className="flex items-center gap-3 border border-kale-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="radio"
                  name="preferred_store"
                  value={st}
                  defaultChecked={(p.preferred_store ?? "HN") === st}
                />
                <span>{st === "HN" ? s.store_hn : s.store_sg}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" className="bg-kale-700 text-white px-6 py-3 rounded-lg font-medium">
            {s.save}
          </button>
        </div>
      </form>

      <section className="pt-8 border-t border-kale-100 text-sm text-kale-500">
        <p>{s.signed_in_pre} <strong className="text-kale-700">{user!.email}</strong></p>
      </section>
    </div>
  );
}
