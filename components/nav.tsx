import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogOut } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const {data:sections}=await createAdminClient().from("section_config").select("section_key,display_name");
  const label=(key:string,fallback:string)=>sections?.find(x=>x.section_key===key)?.display_name||fallback;
  return (
    <aside className="w-full border-b border-slate-800 bg-slate-950 text-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
      <div className="p-5"><div className="text-lg font-bold tracking-tight">FLEETO <span className="text-cyan-400">/ SERVICE</span></div><div className="text-xs text-slate-400">Material / Battery Management</div></div>
      <nav className="grid grid-cols-2 gap-1 px-3 pb-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
        <Link className="nav-link" href="/dashboard">{label("dashboard","Dashboard")}</Link>
        <Link className="nav-link" href="/services">{label("services","Services")}</Link>
        <Link className="nav-link" href="/services/new">{label("service_create","New Record")}</Link>
        <Link className="nav-link" href="/masters">{label("masters","Masters")}</Link>
        <Link className="nav-link" href="/reporting">{label("reporting","Reporting")}</Link>
        <Link className="nav-link" href="/admin/config">Configuration</Link>
        <Link className="nav-link" href="/admin/users">Users</Link>
        <Link className="nav-link" href="/admin/roles">Roles</Link>
        <Link className="nav-link" href="/audit">Audit Trail</Link>
      </nav>
      <div className="border-t border-slate-800 p-4 text-xs text-slate-400">
        <div className="truncate mb-2">{user?.email}</div>
        <form action="/api/auth/logout" method="post"><button className="btn-secondary w-full gap-2 text-slate-900"><LogOut size={15}/> Sign out</button></form>
      </div>
    </aside>
  );
}
