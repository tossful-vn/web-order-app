import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/profile/actions";
import type { Profile } from "@/lib/types/database";

export const metadata = { title: "Hồ sơ · Tossful" };

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle();

  const p = (profile ?? {}) as Partial<Profile>;

  return (
    <div className="max-w-lg space-y-8">
      <section>
        <h1 className="font-display text-4xl text-kale-700 mb-2">Hồ sơ</h1>
        <p className="text-kale-600">
          Thông tin này giúp Tossful xác nhận đơn đặt trước của bạn.
        </p>
      </section>

      <form action={updateProfile} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">
            Tên hiển thị
          </label>
          <input
            name="display_name"
            defaultValue={p.display_name ?? ""}
            placeholder="VD: Hieu"
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-kale-700 mb-1">
            Số điện thoại
          </label>
          <input
            name="contact_phone"
            type="tel"
            defaultValue={p.contact_phone ?? ""}
            placeholder="09xx xxx xxx"
            className="w-full px-4 py-3 border border-kale-200 rounded-lg"
          />
          <p className="text-xs text-kale-500 mt-1">
            Tossful chỉ nhắn để xác nhận đơn — không quảng cáo.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-kale-700 mb-2">
            Cửa hàng quen
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["HN", "SG"] as const).map((s) => (
              <label
                key={s}
                className="flex items-center gap-3 border border-kale-200 rounded-lg p-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="preferred_store"
                  value={s}
                  defaultChecked={(p.preferred_store ?? "HN") === s}
                />
                <span>{s === "HN" ? "Hà Nội" : "Sài Gòn"}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="bg-kale-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Lưu thay đổi
          </button>
        </div>
      </form>

      <section className="pt-8 border-t border-kale-100 text-sm text-kale-500">
        <p>
          Đăng nhập với: <strong className="text-kale-700">{user!.email}</strong>
        </p>
      </section>
    </div>
  );
}
