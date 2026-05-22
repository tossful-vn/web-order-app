import { requireUser } from "@/lib/auth/require-user";

export const metadata = { title: "Đặt trước tuần · Tossful" };

/**
 * Soft pre-order intent form — STUB.
 * Step 4 wires the server action that inserts a week_intents row and
 * triggers the internal notification Edge Function.
 */
export default async function ReservePage() {
  await requireUser();

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="font-display text-3xl text-kale-700 mb-2">
        Đặt trước tuần
      </h1>
      <p className="text-kale-600 mb-6">
        Tossful sẽ liên hệ trong 24h để xác nhận thời gian và thanh toán.
        Chưa thu tiền ở bước này.
      </p>

      <form className="space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-kale-700 mb-2">
            Hình thức nhận
          </legend>
          <label className="flex items-center gap-3 border border-kale-200 rounded-lg p-3 mb-2">
            <input type="radio" name="fulfilment" value="pickup" defaultChecked />
            <span>Tự đến lấy tại cửa hàng</span>
          </label>
          <label className="flex items-center gap-3 border border-kale-200 rounded-lg p-3">
            <input type="radio" name="fulfilment" value="delivery" />
            <span>Giao tận nơi</span>
          </label>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-kale-700 mb-2">
            Cửa hàng
          </legend>
          <select
            name="store"
            className="w-full border border-kale-200 rounded-lg p-3"
          >
            <option value="HN">Hà Nội</option>
            <option value="SG">Sài Gòn</option>
          </select>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-kale-700 mb-2">
            Tuần bắt đầu từ
          </legend>
          <input
            type="date"
            name="starts_on"
            className="w-full border border-kale-200 rounded-lg p-3"
          />
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-kale-700 mb-2">
            Giờ tiện cho bạn
          </legend>
          <input
            type="text"
            name="preferred_handoff_time"
            placeholder="VD: trưa thứ 2-6, sáng cuối tuần"
            className="w-full border border-kale-200 rounded-lg p-3"
          />
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-kale-700 mb-2">
            Số điện thoại để xác nhận
          </legend>
          <input
            type="tel"
            name="contact_phone"
            required
            placeholder="09xx xxx xxx"
            className="w-full border border-kale-200 rounded-lg p-3"
          />
        </fieldset>

        <button
          type="submit"
          className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium"
        >
          Gửi yêu cầu đặt trước
        </button>
      </form>
    </main>
  );
}
