"use client";
// 左側導覽：照 mockup 的 188px 側欄
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/",
    label: "總覽",
    icon: (
      <>
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </>
    ),
  },
  { href: "/trades/", label: "交易", icon: <path d="M2 4h12M2 8h12M2 12h8" /> },
  { href: "/stats/", label: "統計", icon: <path d="M2 13h12M4 11V7M8 11V3M12 11V6" /> },
  {
    href: "/expenses/",
    label: "費用",
    icon: (
      <>
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v6M6.5 6.5h2.5a1 1 0 0 1 0 2h-2a1 1 0 0 0 0 2h2.5" />
      </>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-1 border-r border-line px-3.5 py-[22px]">
      <div className="mb-[22px] flex items-center gap-2.5 px-2.5">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#e0b45c" strokeWidth="1.8">
          <path d="M3 14 L7 9 L10 11 L15 4" />
          <path d="M11 4 H15 V8" />
        </svg>
        <div className="text-[15px] font-extrabold tracking-[-0.01em] text-white">prop-journal</div>
      </div>
      {NAV.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={
              "flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] no-underline " +
              (active
                ? "bg-line font-bold text-white hover:text-white"
                : "font-semibold text-muted hover:text-fg")
            }
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              {n.icon}
            </svg>
            {n.label}
          </Link>
        );
      })}
      <div className="grow" />
      <div className="px-3 text-[11px] font-semibold text-faint">本機資料 · journal.db</div>
    </aside>
  );
}
