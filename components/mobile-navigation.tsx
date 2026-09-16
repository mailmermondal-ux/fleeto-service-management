"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NavItem = { href: string; label: string };

export function MobileNavigation({ items, email }: { items: NavItem[]; email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previouslyOpen = useRef(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) {
      if (previouslyOpen.current) menuButton.current?.focus();
      previouslyOpen.current = false;
      return;
    }
    previouslyOpen.current = true;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const navigation = (
    <>
      <div className="flex items-center justify-between p-5">
        <div>
          <div className="text-lg font-bold tracking-tight">FLEETO <span className="text-red-400">/ SERVICE</span></div>
          <div className="text-xs text-slate-400">Material / Battery Management</div>
        </div>
        <button ref={closeButton} type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white hover:bg-zinc-800 lg:hidden"><X size={22}/></button>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 text-sm">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/services" && item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`nav-link block ${active ? "bg-zinc-800 text-white" : ""}`}>{item.label}</Link>;
        })}
      </nav>
      <div className="border-t border-slate-800 p-4 text-xs text-slate-400">
        <div className="mb-2 truncate">{email}</div>
        <form action="/api/auth/logout" method="post"><button type="submit" className="btn-secondary w-full gap-2 text-slate-900"><LogOut size={15}/> Sign out</button></form>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <button ref={menuButton} type="button" aria-label="Open navigation" aria-expanded={open} aria-controls="fleeto-mobile-navigation" onClick={() => setOpen(true)} className="rounded-lg border border-slate-200 p-2 text-slate-900 hover:bg-slate-100"><Menu size={21}/></button>
        <span className="truncate font-bold text-slate-900">FLEETO <span className="text-red-700">/ SERVICE</span></span>
      </header>
      {open && <button type="button" tabIndex={-1} aria-label="Close navigation overlay" className="fixed inset-0 z-40 bg-zinc-950/60 lg:hidden" onClick={() => setOpen(false)}/>}
      <aside id="fleeto-mobile-navigation" aria-label="Sidebar" aria-hidden={!open ? true : undefined} className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,85vw)] flex-col bg-zinc-950 text-white shadow-2xl transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 lg:border-r lg:border-slate-800 lg:shadow-none ${open ? "translate-x-0 visible" : "-translate-x-full invisible lg:visible"}`}>
        {navigation}
      </aside>
    </>
  );
}
