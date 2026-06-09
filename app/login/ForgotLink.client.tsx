"use client";

import { useRouter } from "next/navigation";

/**
 * "Quên mật khẩu?" link (TSK-144). On click it reads whatever the user has
 * already typed in the login identifier field and forwards it to
 * /forgot-password as ?id= so an email prefills there. Falls back to a plain
 * navigation if the field is empty.
 */
export default function ForgotLink({
  label,
  next,
}: {
  label: string;
  next?: string;
}) {
  const router = useRouter();

  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("identifier") as HTMLInputElement | null;
    const id = el?.value.trim() ?? "";
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (id) params.set("id", id);
    const qs = params.toString();
    router.push("/forgot-password" + (qs ? "?" + qs : ""));
  };

  return (
    <a href="/forgot-password" onClick={go} className="text-kale-700 underline">
      {label}
    </a>
  );
}
