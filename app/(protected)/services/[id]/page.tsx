import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getPermissions } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { calculateTats } from "@/lib/workflow";
import type { ServiceRecord } from "@/lib/types";

export default async function ServiceDetail({ params }: { params: Promise<{ id:string }> }) {
  const user=await requireUser(); const perms=await getPermissions(user.id); if(!perms.has("service.view")) return <div className="card p-6">Your account does not have service access.</div>; const {id}=await params; const db=createAdminClient();
  const [{data:r},{data:history},{data:docs},{data:logistics}] = await Promise.all([
    db.from("service_records").select("*").eq("id",id).maybeSingle(),
    db.from("status_history").select("*, profiles(full_name,email)").eq("service_record_id",id).order("changed_at",{ascending:false}),
    db.from("documents").select("*").eq("service_record_id",id).order("uploaded_at",{ascending:false}),
    db.from("logistics_movements").select("*").eq("service_record_id",id).order("created_at",{ascending:true})
  ]);
  if(!r) notFound();
  const outbound=(logistics??[]).find((x:any)=>x.leg==="TO_SUPPLIER"); const inbound=(logistics??[]).find((x:any)=>x.leg==="TO_FACTORY");
  const tats=calculateTats(r as ServiceRecord,outbound,inbound);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm text-slate-500">Service record</div><h1 className="text-2xl font-bold">{r.serial_number}</h1><div className="mt-2 flex flex-wrap gap-2"><StatusBadge status={r.current_status}/><span className="badge bg-indigo-100 text-indigo-900">TAT: {r.tat_status||"OPEN"}</span></div></div><a href="/services" className="btn-secondary">Back to list</a></div>
    <div className="grid gap-5 xl:grid-cols-3"><section className="card p-5 xl:col-span-2"><h2 className="font-semibold">Material & supply chain</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Info l="Material" v={r.material_description}/><Info l="Received at R&D" v={r.received_date_rnd}/><Info l="Sale date" v={r.sale_date}/><Info l="Mode of receiving" v={r.receiving_mode==="FLEETO_FACTORY"?"From FLEETO Factory":"Direct from Business Partners"}/><Info l="Warranty" v={r.warranty_status?.replaceAll("_"," ")}/><Info l="TAT status" v={r.tat_status}/>{Object.entries(r.custom_fields||{}).map(([k,v])=><Info key={k} l={k.replaceAll("_"," ")} v={v}/>)}<Info l="Supplier" v={r.supplier_name}/><Info l="Distributor" v={r.distributor_name}/><Info l="Dealer" v={r.dealer_name}/><div className="md:col-span-2"><Info l="Defined issue" v={r.defined_issue}/></div></div></section>
    <section className="card p-5"><h2 className="font-semibold">TAT (days)</h2><div className="mt-4 grid grid-cols-2 gap-3"><Tat l="Overall" v={tats.overall ?? tats.sameReturn}/><Tat l="Same Return" v={tats.sameReturn}/><Tat l="Service Station" v={tats.station}/><Tat l="Supplier" v={tats.supplier}/><Tat l="Logistics → Supplier" v={tats.toSupplier}/><Tat l="Logistics → Factory" v={tats.toFactory}/></div></section></div>
    <WorkflowNodes status={r.current_status} condition={r.material_condition}/>
    {perms.has("workflow.tat_manage")&&r.current_status!=="CLOSED"&&<form action={`/api/services/${id}/tat`} method="post" className="card flex flex-wrap items-end gap-3 p-5"><div><label>TAT status</label><select name="tat_status" defaultValue={r.tat_status}><option value="OPEN">Open</option><option value="HOLD">Hold</option><option value="OUT_OF_WARRANTY">Out of warranty</option></select></div><div className="min-w-48 flex-1"><label>Hold reason (mandatory for Hold)</label><input name="hold_reason" defaultValue={r.hold_reason||""}/></div><button className="btn-secondary">Update TAT status</button></form>}
    <Workflow record={r} />
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-5"><h2 className="font-semibold">Logistics movements</h2><div className="mt-3 space-y-3">{(logistics??[]).map((x:any)=><div key={x.id} className="rounded-lg border p-3 text-sm"><div className="font-semibold">{x.leg==="TO_SUPPLIER"?"Service Station → Supplier":"Supplier → Factory"}</div><div className="mt-1 text-slate-600">{x.logistic_company} · Tracking: {x.tracking_id}</div><div className="text-slate-500">Dispatch {x.dispatch_date} · ETA {x.eta_date || "—"}</div></div>)}{!logistics?.length&&<p className="text-sm text-slate-500">No logistics movements yet.</p>}</div></section>
      <section className="card p-5"><h2 className="font-semibold">Documents</h2><div className="mt-3 space-y-2">{(docs??[]).map((d:any)=><a key={d.id} className="block rounded-lg border p-3 text-sm hover:bg-slate-50" href={`/api/services/${id}/documents?document=${d.id}`}><b>{d.document_type.replaceAll("_"," ")}</b><div className="text-slate-500">{d.original_name}</div></a>)}{!docs?.length&&<p className="text-sm text-slate-500">No documents uploaded.</p>}</div></section>
    </div>
    <section className="card p-5"><h2 className="font-semibold">Status history</h2><div className="mt-3 space-y-3">{(history??[]).map((h:any)=><div key={h.id} className="flex gap-3 border-b pb-3 last:border-0"><div className="mt-1 h-2 w-2 rounded-full bg-slate-400"/><div><div className="text-sm font-semibold">{h.status.replaceAll("_"," ")}</div><div className="text-xs text-slate-500">{new Date(h.changed_at).toLocaleString()} · {h.profiles?.full_name || h.profiles?.email || "User"}</div>{h.notes&&<div className="mt-1 text-sm text-slate-600">{h.notes}</div>}</div></div>)}</div></section>
  </div>;
}
function Info({l,v}:{l:string;v:any}){return <div><div className="text-xs uppercase tracking-wide text-slate-400">{l}</div><div className="mt-1 text-sm font-medium">{v || "—"}</div></div>}
function Tat({l,v}:{l:string;v:number|null}){return <div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{l}</div><div className="text-xl font-bold">{v ?? "—"}</div></div>}
function Workflow({record:r}:{record:any}){
  const id=r.id; const action="/api/services/"+id+"/actions";
  return <section className="card p-5"><h2 className="font-semibold">Next workflow action</h2><div className="mt-4">
    {r.current_status==="MATERIAL_RECEIVED"&&<ActionForm action={action} name="start_testing" title="Start testing"><p className="text-sm text-slate-500">Records the testing start date/time automatically.</p></ActionForm>}
    {r.current_status==="TESTING_STARTED"&&<ActionForm action={action} name="complete_testing" title="Complete testing" multipart><div className="grid gap-3 md:grid-cols-3"><Field label="Test Report"><input name="test_report" type="file" required/></Field><Field label="Condition"><select name="material_condition" required><option value="">Select</option><option value="OK">OK / No Defect</option><option value="DEFECTIVE">Defective</option></select></Field><Field label="Return Date (required for OK)"><input name="return_date" type="date"/></Field></div></ActionForm>}
    {r.current_status==="SEND_TO_SUPPLIER_END"&&<ActionForm action={action} name="dispatch_supplier" title="Dispatch to supplier"><div className="grid gap-3 md:grid-cols-4"><Field label="Logistics Company"><input name="logistic_company" required/></Field><Field label="Tracking ID"><input name="tracking_id" required/></Field><Field label="ETA Date"><input name="eta_date" type="date" required/></Field><Field label="Dispatch Date"><input name="dispatch_date" type="date" required/></Field></div></ActionForm>}
    {r.current_status==="IN_TRANSIT_TO_SUPPLIER"&&<ActionForm action={action} name="supplier_received" title="Confirm supplier receipt"><Field label="Supplier Receiving Date"><input name="supplier_receiving_date" type="date" required/></Field></ActionForm>}
    {r.current_status==="UNDER_SERVICING"&&<ActionForm action={action} name="complete_servicing" title="Complete servicing / submit RCA" multipart><div className="grid gap-3 md:grid-cols-2"><Field label="RCA Document"><input name="rca_document" type="file" required/></Field><Field label="Servicing Completion Date"><input name="servicing_completion_date" type="date" required/></Field><Field label="Repair Action"><input name="repair_action"/></Field><Field label="Replaced Components"><input name="replaced_components"/></Field><div className="md:col-span-2"><Field label="Supplier Remarks"><textarea name="supplier_remarks" rows={3}/></Field></div></div></ActionForm>}
    {r.current_status==="SERVICING_COMPLETED"&&<ActionForm action={action} name="dispatch_factory" title="Return from supplier / dispatch to factory"><div className="grid gap-3 md:grid-cols-4"><Field label="Logistics Company"><input name="logistic_company" required/></Field><Field label="Tracking ID"><input name="tracking_id" required/></Field><Field label="ETA Date"><input name="eta_date" type="date" required/></Field><Field label="Supplier Dispatch Date"><input name="dispatch_date" type="date" required/></Field></div></ActionForm>}
    {r.current_status==="IN_TRANSIT_TO_FACTORY"&&<ActionForm action={action} name="factory_received" title="Confirm factory receipt & close"><Field label="Factory Receiving Date"><input name="factory_receiving_date" type="date" required/></Field></ActionForm>}
    {r.current_status==="CLOSED"&&<div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">This service record is closed. It is read-only except for authorized administrators.</div>}
  </div></section>
}
function ActionForm({action,name,title,children,multipart}:{action:string;name:string;title:string;children:React.ReactNode;multipart?:boolean}){return <form action={action} method="post" encType={multipart?"multipart/form-data":undefined} className="space-y-4"><input type="hidden" name="action" value={name}/><div className="font-medium">{title}</div>{children}<button className="btn-primary" type="submit">Confirm action</button></form>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="space-y-1"><label>{label}</label>{children}</div>}

function WorkflowNodes({status,condition}:{status:string;condition:string|null}) {
 const common=[['MATERIAL_RECEIVED','Received'],['TESTING_STARTED','Testing']];
 const ok=[['MATERIAL_OK_SAME_RETURN','Same return'],['CLOSED','Closed']];
 const defective=[['SEND_TO_SUPPLIER_END','Supplier dispatch'],['IN_TRANSIT_TO_SUPPLIER','To supplier'],['UNDER_SERVICING','Supplier servicing'],['SERVICING_COMPLETED','RCA complete'],['IN_TRANSIT_TO_FACTORY','To factory'],['CLOSED','Closed']];
 const steps=[...common,...(condition==='OK'?ok:defective)];
 const aliases:Record<string,string>={RECEIVED_AT_SUPPLIER_END:'UNDER_SERVICING',RETURNING_FROM_SUPPLIER_END:'IN_TRANSIT_TO_FACTORY',BATTERY_RECEIVED_AT_FACTORY:'CLOSED'};
 const current=steps.findIndex(([key])=>key===(aliases[status]||status));
 return <section className="card p-5"><h2 className="text-lg font-bold">Service journey</h2><p className="mb-5 text-sm text-slate-500">Follow the connected steps in sequence. Only the current action is available below.</p><ol className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{steps.map(([key,label],index)=><li key={key} className={`relative rounded-xl border-2 p-4 ${index<current?'border-emerald-200 bg-emerald-50':index===current?'border-indigo-500 bg-indigo-50 shadow-sm':'border-slate-200 bg-slate-50 opacity-60'}`}><span className="text-xs font-bold uppercase tracking-widest">Step {index+1} · {index<current?'Completed':index===current?'Current':'Locked'}</span><div className="mt-2 font-semibold">{label}</div>{index<steps.length-1&&<span aria-hidden className="absolute right-2 top-2 text-indigo-500">→</span>}</li>)}</ol></section>
}
