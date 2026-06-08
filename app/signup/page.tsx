import Link from "next/link";
import { signUpWithEmail } from "@/lib/auth/phone-actions";
import { getServerLang } from "@/lib/lang-server";
import PasswordField from "@/lib/components/PasswordField.client";
import ConsentFields from "./ConsentFields.client";

const STRINGS = {
  en: {
    metadata: "Create account · Tossful",
    title: "Create account",
    sub: "Sign up to save bowls and plan a whole week.",
    email_label: "Email *",
    email_ph: "Your email (e.g. name@example.com)",
    name_label: "Name *",
    name_ph: "Full name or nickname",
    pwd_label: "Password *",
    pwd_ph: "At least 8 characters",
    phone_label: "Phone",
    phone_ph: "Phone number (optional, for delivery)",
    btn: "Create account",
    have_account_pre: "Already have an account?",
    signin_link: "Sign in",
    show: "Show password",
    hide: "Hide password",
    consent_txn:
      "I agree to receive transactional emails (order confirmations, receipts, account updates) from Tossful.",
    consent_mkt:
      "I agree to receive marketing emails (promotions, vouchers, events) from Tossful.",
    consent_txn_required:
      "We need this to send order confirmations. Without it, an account can't be created.",
  },
  vi: {
    metadata: "Tạo tài khoản · Tossful",
    title: "Tạo tài khoản",
    sub: "Tạo tài khoản để lưu bowl và lên kế hoạch cho cả tuần.",
    email_label: "Email *",
    email_ph: "Email của bạn (ví dụ name@example.com)",
    name_label: "Tên *",
    name_ph: "Họ và tên hoặc nickname",
    pwd_label: "Mật khẩu *",
    pwd_ph: "Tối thiểu 8 ký tự",
    phone_label: "Số điện thoại",
    phone_ph: "Số điện thoại (không bắt buộc, để giao hàng)",
    btn: "Tạo tài khoản",
    have_account_pre: "Đã có tài khoản?",
    signin_link: "Đăng nhập",
    show: "Hiện mật khẩu",
    hide: "Ẩn mật khẩu",
    consent_txn:
      "Tôi đồng ý nhận email giao dịch (xác nhận đơn hàng, biên lai, cập nhật tài khoản) từ Tossful.",
    consent_mkt:
      "Tôi đồng ý nhận email khuyến mãi, voucher, sự kiện từ Tossful.",
    consent_txn_required:
      "Cần đồng ý để chúng tôi gửi xác nhận đơn hàng. Không đồng ý thì không thể tạo tài khoản.",
  },
} as const;

export async function generateMetadata() {
  return { title: STRINGS[getServerLang()].metadata };
}

export default function SignupPage({
  searchParams,
}: {
  searchParams: {
    error?: string;
    email?: string;
    name?: string;
    phone?: string;
    next?: string;
  };
}) {
  const s = STRINGS[getServerLang()];
  const error = searchParams.error;
  const email = searchParams.email ?? "";
  const name = searchParams.name ?? "";
  const phone = searchParams.phone ?? "";
  const next = searchParams.next ?? "";

  const loginHref = "/login" + (next ? "?next=" + encodeURIComponent(next) : "");

  const inputCls =
    "w-full px-4 py-3 border border-kale-200 rounded-lg focus:outline-none focus:border-kale-500";
  const labelCls = "block text-sm font-medium text-kale-700 mb-1";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
        <img
          src="/brand/tossful-mascot.png"
          alt=""
          aria-hidden="true"
          className="w-40 sm:w-[280px] h-auto shrink-0 select-none"
        />
        <div className="w-full max-w-sm bg-white border border-kale-100 rounded-2xl p-8 shadow-sm">
          <h1 className="font-display text-3xl text-kale-700 mb-2">{s.title}</h1>
          <p className="text-sm text-kale-600 mb-6">{s.sub}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <form action={signUpWithEmail} className="space-y-3">
            <input type="hidden" name="next" value={next} />

            <div>
              <label htmlFor="email" className={labelCls}>{s.email_label}</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoCapitalize="none"
                defaultValue={email}
                placeholder={s.email_ph}
                autoComplete="email"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="display_name" className={labelCls}>{s.name_label}</label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                required
                minLength={2}
                defaultValue={name}
                placeholder={s.name_ph}
                autoComplete="name"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelCls}>{s.pwd_label}</label>
              <PasswordField
                name="password"
                required
                minLength={8}
                placeholder={s.pwd_ph}
                autoComplete="new-password"
                showLabel={s.show}
                hideLabel={s.hide}
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelCls}>{s.phone_label}</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={phone}
                placeholder={s.phone_ph}
                autoComplete="tel"
                className={inputCls}
              />
            </div>

            <ConsentFields
              transactionalLabel={s.consent_txn}
              marketingLabel={s.consent_mkt}
              transactionalRequiredMsg={s.consent_txn_required}
            />

            <button
              type="submit"
              className="w-full bg-kale-700 text-white py-3 rounded-lg font-medium hover:bg-kale-800 transition"
            >
              {s.btn}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-kale-600">
            {s.have_account_pre}{" "}
            <Link href={loginHref} className="text-kale-700 underline">
              {s.signin_link}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
