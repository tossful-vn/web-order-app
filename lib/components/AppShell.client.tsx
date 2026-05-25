"use client";

// All Vietnamese strings as const at the top per phase2-session-lessons gotcha #1.
// Keep body below ASCII-only.
const VI = {
  nav_calc: "Dinh dưỡng",
  nav_week: "Tuần của tôi",
  nav_bowls: "Bowl đã lưu",
  menu_label: "Menu",
  drawer_guest: "Khách",
  drawer_guest_sub: "Đăng nhập hoặc tạo tài khoản để lưu bowl",
  drawer_signedin: "Đã đăng nhập",
  account_label: "Tài khoản",
  profile: "Hồ sơ",
  password: "Đổi mật khẩu",
  help_label: "Hỗ trợ",
  feedback: "Gửi góp ý",
  prefs_label: "Tùy chỉnh",
  language: "Ngôn ngữ",
  signout: "Đăng xuất",
  signin_cta: "Đăng nhập",
  close: "Đóng",
};

const EN = {
  nav_calc: "Calculator",
  nav_week: "My week",
  nav_bowls: "Saved bowls",
  menu_label: "Menu",
  drawer_guest: "Guest",
  drawer_guest_sub: "Sign in or create an account to save bowls",
  drawer_signedin: "Signed in",
  account_label: "Account",
  profile: "Profile",
  password: "Change password",
  help_label: "Help",
  feedback: "Send feedback",
  prefs_label: "Preferences",
  language: "Language",
  signout: "Sign out",
  signin_cta: "Sign in",
  close: "Close",
};

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang, persistLang, type Lang } from "@/lib/lang";
import { signOut } from "@/lib/auth/actions";

type Props = {
  user: { email: string | null | undefined } | null;
  children: React.ReactNode;
};

export default function AppShell({ user, children }: Props) {
  const pathname = usePathname() ?? "";
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const str = lang === "vi" ? VI : EN;

  const isCalc = pathname.startsWith("/nutrition");
  const isWeek = pathname.startsWith("/byw");
  const isBowls = pathname.startsWith("/account");

  // Close drawer when route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navLinks = [
    { href: "/nutrition", label: str.nav_calc, active: isCalc },
    { href: "/byw", label: str.nav_week, active: isWeek },
    { href: "/account", label: str.nav_bowls, active: isBowls },
  ];

  return (
    <>
      {/* Tabler icons CDN — used by drawer + calculator chip icons */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.21.0/dist/tabler-icons.min.css"
      />

      <header className="bg-white border-b border-kale-100 sticky top-0 z-30">
        <div className="px-3 py-2.5 flex items-center gap-2 max-w-5xl mx-auto">
          <Link
            href="/"
            prefetch
            className="font-display italic text-kale-700 text-xl shrink-0 leading-none"
            style={{ letterSpacing: "-0.2px" }}
          >
            Tossful
          </Link>
          <nav className="flex-1 flex items-center justify-center gap-3 sm:gap-5 overflow-x-auto"
               style={{ scrollbarWidth: "none" }}>
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                prefetch
                className={
                  "text-xs whitespace-nowrap py-1.5 border-b-2 transition-colors " +
                  (l.active
                    ? "text-kale-700 border-kale-700 font-medium"
                    : "text-kale-500 border-transparent hover:text-kale-700")
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-full bg-kale-50 text-kale-700 flex items-center justify-center shrink-0"
            aria-label={str.menu_label}
          >
            <i className="ti ti-menu-2 text-xl" />
          </button>
        </div>
      </header>

      <main>{children}</main>

      {/* Drawer backdrop */}
      <div
        className={
          "fixed inset-0 z-40 transition-opacity " +
          (open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        style={{ background: "rgba(15,86,61,0.4)" }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={
          "fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-cream z-50 flex flex-col " +
          "shadow-2xl transition-transform duration-300 " +
          (open ? "translate-x-0" : "translate-x-full")
        }
        role="dialog"
        aria-label={str.menu_label}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-kale-100">
          <div className="text-xs text-kale-500">
            {user ? (
              <>
                <div className="text-kale-700 font-medium text-sm break-all">
                  {user.email ?? "—"}
                </div>
                <div>{str.drawer_signedin}</div>
              </>
            ) : (
              <>
                <div className="text-kale-700 font-medium text-sm">{str.drawer_guest}</div>
                <div className="text-[11px]">{str.drawer_guest_sub}</div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-kale-50 text-kale-700 flex items-center justify-center shrink-0"
            aria-label={str.close}
          >
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {user && (
            <>
              <div className="text-[10px] text-kale-400 uppercase tracking-widest px-5 pt-3 pb-2 font-medium">
                {str.account_label}
              </div>
              <Link
                href="/account/profile"
                className="flex items-center gap-3 px-5 py-3 text-sm text-ink hover:bg-kale-50 active:bg-kale-100"
              >
                <i className="ti ti-user text-xl text-kale-700 w-6 text-center" />
                <span className="flex-1">{str.profile}</span>
                <i className="ti ti-chevron-right text-kale-300" />
              </Link>
              <Link
                href="/account/password"
                className="flex items-center gap-3 px-5 py-3 text-sm text-ink hover:bg-kale-50 active:bg-kale-100"
              >
                <i className="ti ti-lock text-xl text-kale-700 w-6 text-center" />
                <span className="flex-1">{str.password}</span>
                <i className="ti ti-chevron-right text-kale-300" />
              </Link>
              <div className="border-t border-kale-100 my-2" />
            </>
          )}

          <div className="text-[10px] text-kale-400 uppercase tracking-widest px-5 pt-3 pb-2 font-medium">
            {str.prefs_label}
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-ink">
              <i className="ti ti-world text-xl text-kale-700 w-6 text-center" />
              <span>{str.language}</span>
            </div>
            <div className="flex bg-kale-50 rounded-full p-0.5">
              <button
                type="button"
                onClick={() => persistLang("en")}
                className={
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors " +
                  (lang === "en" ? "bg-kale-700 text-cream" : "text-kale-700")
                }
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => persistLang("vi")}
                className={
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors " +
                  (lang === "vi" ? "bg-kale-700 text-cream" : "text-kale-700")
                }
              >
                VI
              </button>
            </div>
          </div>

          <div className="border-t border-kale-100 my-2" />

          <div className="text-[10px] text-kale-400 uppercase tracking-widest px-5 pt-3 pb-2 font-medium">
            {str.help_label}
          </div>
          <Link
            href="/feedback"
            className="flex items-center gap-3 px-5 py-3 text-sm text-ink hover:bg-kale-50 active:bg-kale-100"
          >
            <i className="ti ti-message-circle text-xl text-kale-700 w-6 text-center" />
            <span className="flex-1">{str.feedback}</span>
            <i className="ti ti-chevron-right text-kale-300" />
          </Link>

          {!user && (
            <>
              <div className="border-t border-kale-100 my-2" />
              <Link
                href="/login"
                className="flex items-center gap-3 px-5 py-3 text-sm text-kale-700 hover:bg-kale-50 font-medium"
              >
                <i className="ti ti-login text-xl text-kale-700 w-6 text-center" />
                <span>{str.signin_cta}</span>
              </Link>
            </>
          )}
        </div>

        {user && (
          <div className="border-t border-kale-100 px-5 py-4">
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-3 text-sm font-medium"
                style={{ color: "#7D291A" }}
              >
                <i className="ti ti-logout text-xl" />
                <span>{str.signout}</span>
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
// trailing buffer
