import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogOut } from "lucide-react";

export async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <aside className="w-full border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="p-5"><div className="text-lg font-bold">Fleeto Service</div><div className="text-xs text-slate-500">Material / Battery Management</div></div>
      <nav className="grid grid-cols-3 gap-1 px-3 pb-3 text-sm lg:grid-cols-1">
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/dashboard">Dashboard</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/services">Services</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/services/new">New Record</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/masters">Masters</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/admin/users">Users</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/admin/roles">Roles</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" href="/audit">Audit Trail</Link>
      </nav>
      <div className="border-t p-4 text-xs text-slate-500">
        <div className="truncate mb-2">{user?.email}</div>
        <form action="/api/auth/logout" method="post"><button className="btn-secondary w-full gap-2"><LogOut size={15}/> Sign out</button></form>
      </div>
    </aside>
  );
}
