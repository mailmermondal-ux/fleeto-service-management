import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getPermissions } from "@/lib/auth";
export default async function NewServicePage() {
  const user=await requireUser(); const perms=await getPermissions(user.id); if(!perms.has("service.create")) return <div className="card p-6">You do not have permission to create service records.</div>; const db=createAdminClient();
  const [{data:suppliers},{data:distributors},{data:dealers}] = await Promise.all([
    db.from("suppliers").select("name").eq("is_active",true).order("name"), db.from("distributors").select("name").eq("is_active",true).order("name"), db.from("dealers").select("name").eq("is_active",true).order("name")
  ]);
  return <div className="mx-auto max-w-4xl space-y-5"><div><h1 className="text-2xl font-bold">New Service Record</h1><p className="text-sm text-slate-500">All fields below are mandatory for Material Received.</p></div>
    <form action="/api/services" method="post" className="card grid gap-4 p-6 md:grid-cols-2">
      <Field label="Serial Number"><input name="serial_number" required/></Field>
      <Field label="Description of Material"><input name="material_description" required/></Field>
      <Field label="Received Date at R&D"><input name="received_date_rnd" type="date" required/></Field>
      <Field label="Sale Date"><input name="sale_date" type="date" required/></Field>
      <Field label="Supplier Name"><InputList name="supplier_name" list="suppliers" data={suppliers}/></Field>
      <Field label="Distributor Name"><InputList name="distributor_name" list="distributors" data={distributors}/></Field>
      <Field label="Dealer Name"><InputList name="dealer_name" list="dealers" data={dealers}/></Field>
      <div className="md:col-span-2"><Field label="Defined Issue"><textarea name="defined_issue" rows={4} required/></Field></div>
      <div className="md:col-span-2 flex justify-end gap-2"><a className="btn-secondary" href="/services">Cancel</a><button className="btn-primary" type="submit">Create service record</button></div>
    </form>
  </div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}) { return <div className="space-y-1.5"><label>{label}</label>{children}</div> }
function InputList({name,list,data}:{name:string;list:string;data:any[]|null}) { return <><input name={name} list={list} required/><datalist id={list}>{(data??[]).map((x:any)=><option key={x.name} value={x.name}/>)}</datalist></> }
