import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getPermissions } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import type { ServiceRecord } from "@/lib/types";

export default async function Dashboard() {
  const user=await requireUser(); const perms=await getPermissions(user.id); if(!perms.has("service.view")) return <div className="card p-6">Your account does not have service access.</div>; const db = createAdminClient();
  const [{ data: records }, { count: openCount }, { count: closedCount }] = await Promise.all([
    db.from("service_records").select("*").order("created_at", { ascending: false }).limit(8),
    db.from("service_records").select("id", { count: "exact", head: true }).neq("current_status", "CLOSED"),
    db.from("service_records").select("id", { count: "exact", head: true }).eq("current_status", "CLOSED")
  ]);
  const inService = (records ?? []).filter((r:any) => ["UNDER_SERVICING","SERVICING_COMPLETED"].includes(r.current_status)).length;
  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-slate-500">End-to-end service lifecycle overview</p></div><Link href="/services/new" className="btn-primary">New service record</Link></div>
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Open records" value={openCount ?? 0}/><Metric label="Closed records" value={closedCount ?? 0}/><Metric label="In servicing (latest 8)" value={inService}/></div>
    <div className="card overflow-hidden"><div className="border-b px-5 py-4 font-semibold">Recent service records</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Serial</th><th className="p-3">Material</th><th className="p-3">Supplier</th><th className="p-3">Current status</th><th className="p-3">TAT status</th><th className="p-3">Received</th></tr></thead><tbody>{(records as ServiceRecord[] ?? []).map(r=><tr key={r.id} className="border-t"><td className="p-3 font-semibold"><Link className="hover:underline" href={`/services/${r.id}`}>{r.serial_number}</Link></td><td className="p-3">{r.material_description}</td><td className="p-3">{r.supplier_name}</td><td className="p-3"><StatusBadge status={r.current_status}/></td><td className="p-3"><span className="badge bg-indigo-50 text-indigo-800">{(r as any).tat_status?.replaceAll("_"," ")||"OPEN"}</span></td><td className="p-3">{r.received_date_rnd}</td></tr>)}</tbody></table></div></div>
  </div>;
}
function Metric({label,value}:{label:string;value:number}) { return <div className="card p-5"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-3xl font-bold">{value}</div></div> }
