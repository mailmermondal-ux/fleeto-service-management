import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getPermissions } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import type { ServiceRecord } from "@/lib/types";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user=await requireUser(); const perms=await getPermissions(user.id); if(!perms.has("service.view")) return <div className="card p-6">Your account does not have service access.</div>; const { q = "", status = "" } = await searchParams; const db = createAdminClient();
  let query = db.from("service_records").select("*").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`serial_number.ilike.%${q}%,material_description.ilike.%${q}%,defined_issue.ilike.%${q}%`);
  if (status) query = query.eq("current_status", status);
  const { data } = await query;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Service Records</h1><p className="text-sm text-slate-500">Search by serial number, material or issue.</p></div><Link href="/services/new" className="btn-primary">New record</Link></div>
    <form className="card grid gap-3 p-4 md:grid-cols-[1fr_240px_auto]">
      <input name="q" defaultValue={q} placeholder="Search..." />
      <select name="status" defaultValue={status}><option value="">All statuses</option>{["MATERIAL_RECEIVED","TESTING_STARTED","SEND_TO_SUPPLIER_END","IN_TRANSIT_TO_SUPPLIER","UNDER_SERVICING","SERVICING_COMPLETED","IN_TRANSIT_TO_FACTORY","CLOSED"].map(s=><option key={s}>{s}</option>)}</select>
      <button className="btn-secondary">Filter</button>
    </form>
    <div className="card overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Serial</th><th className="p-3">Material</th><th className="p-3">Issue</th><th className="p-3">Supplier</th><th className="p-3">Current status</th><th className="p-3">TAT status</th><th className="p-3">Received</th><th className="p-3">Updated</th></tr></thead><tbody>{(data as ServiceRecord[] ?? []).map(r=><tr className="border-t" key={r.id}><td className="p-3 font-semibold"><Link className="hover:underline" href={`/services/${r.id}`}>{r.serial_number}</Link></td><td className="p-3">{r.material_description}</td><td className="max-w-64 truncate p-3">{r.defined_issue}</td><td className="p-3">{r.supplier_name}</td><td className="p-3"><StatusBadge status={r.current_status}/></td><td className="p-3">{(r as any).tat_status||"OPEN"}</td><td className="p-3">{r.received_date_rnd}</td><td className="p-3">{new Date(r.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
  </div>;
}
