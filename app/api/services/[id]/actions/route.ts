import { NextResponse } from "next/server";
import { getCurrentUser, assertPermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function uploadDoc(db:any, serviceId:string, file:File, type:string, userId:string){
  if(!file || file.size===0) throw new Error(`${type} file is required`);
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"); const path=`${serviceId}/${type}/${Date.now()}-${safe}`;
  const bytes=new Uint8Array(await file.arrayBuffer());
  const {error}=await db.storage.from("service-documents").upload(path,bytes,{contentType:file.type || "application/octet-stream",upsert:false});
  if(error) throw error;
  const {data,error:de}=await db.from("documents").insert({service_record_id:serviceId,document_type:type,storage_path:path,original_name:file.name,mime_type:file.type,size_bytes:file.size,uploaded_by:userId}).select("id").single();
  if(de) throw de; return data.id;
}
async function status(db:any,id:string,status:string,userId:string,notes?:string){
  await db.from("service_records").update({current_status:status,updated_by:userId,updated_at:new Date().toISOString()}).eq("id",id);
  await db.from("status_history").insert({service_record_id:id,status,changed_by:userId,notes:notes||null});
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser(); if(!user) return NextResponse.redirect(new URL("/login",req.url),303);
  const {id}=await params; const form=await req.formData(); const action=String(form.get("action")||"");
  const needed:Record<string,string>={start_testing:"workflow.testing",complete_testing:"workflow.testing",dispatch_supplier:"workflow.supplier_dispatch",supplier_received:"workflow.supplier_service",complete_servicing:"workflow.supplier_service",dispatch_factory:"workflow.supplier_service",factory_received:"workflow.factory_receipt"};
  try{await assertPermission(user.id,needed[action]||"__invalid__")}catch{return new NextResponse("Forbidden",{status:403})}
  const db=createAdminClient();
  const {data:r}=await db.from("service_records").select("*").eq("id",id).single(); if(!r) return new NextResponse("Not found",{status:404});
  try{
    if(action==="start_testing"){
      if(r.current_status!=="MATERIAL_RECEIVED") throw new Error("Invalid status transition");
      await db.from("service_records").update({testing_started_at:new Date().toISOString(),updated_by:user.id}).eq("id",id); await status(db,id,"TESTING_STARTED",user.id);
    } else if(action==="complete_testing"){
      if(r.current_status!=="TESTING_STARTED") throw new Error("Invalid status transition");
      const condition=String(form.get("material_condition")||""); if(!["OK","DEFECTIVE"].includes(condition)) throw new Error("Material condition is required");
      const file=form.get("test_report") as File; await uploadDoc(db,id,file,"TEST_REPORT",user.id); const returnDate=String(form.get("return_date")||"");
      if(condition==="OK"&&!returnDate) throw new Error("Return Date is required for OK material");
      await db.from("service_records").update({material_condition:condition,testing_completed_at:new Date().toISOString(),return_date:returnDate||null,updated_by:user.id}).eq("id",id);
      if(condition==="OK"){ await status(db,id,"MATERIAL_OK_SAME_RETURN",user.id); await status(db,id,"CLOSED",user.id,"OK route closed after return date confirmation"); }
      else await status(db,id,"SEND_TO_SUPPLIER_END",user.id);
    } else if(action==="dispatch_supplier"){
      if(r.current_status!=="SEND_TO_SUPPLIER_END") throw new Error("Invalid status transition");
      const x={logistic_company:String(form.get("logistic_company")||""),tracking_id:String(form.get("tracking_id")||""),eta_date:String(form.get("eta_date")||""),dispatch_date:String(form.get("dispatch_date")||"")};
      if(Object.values(x).some(v=>!v)) throw new Error("All supplier logistics fields are required"); if(x.dispatch_date<r.received_date_rnd) throw new Error("Dispatch date cannot be before R&D received date");
      await db.from("logistics_movements").insert({service_record_id:id,leg:"TO_SUPPLIER",...x,created_by:user.id}); await status(db,id,"IN_TRANSIT_TO_SUPPLIER",user.id);
    } else if(action==="supplier_received"){
      if(r.current_status!=="IN_TRANSIT_TO_SUPPLIER") throw new Error("Invalid status transition"); const d=String(form.get("supplier_receiving_date")||"");
      const {data:move}=await db.from("logistics_movements").select("dispatch_date").eq("service_record_id",id).eq("leg","TO_SUPPLIER").single(); if(!d) throw new Error("Supplier Receiving Date required"); if(move&&d<move.dispatch_date) throw new Error("Supplier Receiving Date cannot be before dispatch date");
      await db.from("service_records").update({supplier_receiving_date:d,updated_by:user.id}).eq("id",id); await status(db,id,"RECEIVED_AT_SUPPLIER_END",user.id); await status(db,id,"UNDER_SERVICING",user.id,"Supplier receipt confirmed; servicing started");
    } else if(action==="complete_servicing"){
      if(r.current_status!=="UNDER_SERVICING") throw new Error("Invalid status transition"); const d=String(form.get("servicing_completion_date")||""); if(!d) throw new Error("Servicing Completion Date required"); if(r.supplier_receiving_date&&d<r.supplier_receiving_date) throw new Error("Servicing completion cannot be before supplier receipt");
      await uploadDoc(db,id,form.get("rca_document") as File,"RCA",user.id); await db.from("service_records").update({servicing_completion_date:d,repair_action:String(form.get("repair_action")||"")||null,replaced_components:String(form.get("replaced_components")||"")||null,supplier_remarks:String(form.get("supplier_remarks")||"")||null,updated_by:user.id}).eq("id",id); await status(db,id,"SERVICING_COMPLETED",user.id);
    } else if(action==="dispatch_factory"){
      if(r.current_status!=="SERVICING_COMPLETED") throw new Error("Invalid status transition"); const x={logistic_company:String(form.get("logistic_company")||""),tracking_id:String(form.get("tracking_id")||""),eta_date:String(form.get("eta_date")||""),dispatch_date:String(form.get("dispatch_date")||"")}; if(Object.values(x).some(v=>!v)) throw new Error("All factory logistics fields are required"); if(r.servicing_completion_date&&x.dispatch_date<r.servicing_completion_date) throw new Error("Dispatch cannot be before servicing completion");
      await db.from("logistics_movements").insert({service_record_id:id,leg:"TO_FACTORY",...x,created_by:user.id}); await status(db,id,"RETURNING_FROM_SUPPLIER_END",user.id); await status(db,id,"IN_TRANSIT_TO_FACTORY",user.id);
    } else if(action==="factory_received"){
      if(r.current_status!=="IN_TRANSIT_TO_FACTORY") throw new Error("Invalid status transition"); const d=String(form.get("factory_receiving_date")||""); const {data:move}=await db.from("logistics_movements").select("dispatch_date").eq("service_record_id",id).eq("leg","TO_FACTORY").single(); if(!d) throw new Error("Factory Receiving Date required"); if(move&&d<move.dispatch_date) throw new Error("Factory Receiving Date cannot be before supplier dispatch date");
      await db.from("service_records").update({factory_receiving_date:d,updated_by:user.id}).eq("id",id); await status(db,id,"BATTERY_RECEIVED_AT_FACTORY",user.id); await status(db,id,"CLOSED",user.id,"Defective route closed after factory receipt");
    } else throw new Error("Unknown action");
    await db.from("audit_logs").insert({user_id:user.id,entity_type:"service_record",entity_id:id,action:`WORKFLOW_${action.toUpperCase()}`});
    return NextResponse.redirect(new URL(`/services/${id}`,req.url),303);
  }catch(e:any){return new NextResponse(e?.message||"Workflow action failed",{status:400})}
}
