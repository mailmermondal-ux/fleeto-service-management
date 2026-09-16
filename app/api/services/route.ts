import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, assertPermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
const schema=z.object({serial_number:z.string().min(1),material_description:z.string().min(1),received_date_rnd:z.string().min(1),supplier_name:z.string().min(1),distributor_name:z.string().min(1),dealer_name:z.string().min(1),sale_date:z.string().min(1),defined_issue:z.string().min(1),receiving_mode:z.enum(["DIRECT_PARTNER","FLEETO_FACTORY"]),warranty_status:z.enum(["UNDER_WARRANTY","OUT_OF_WARRANTY"])});
export async function POST(req:Request){
  const user=await getCurrentUser(); if(!user) return NextResponse.redirect(new URL("/login",req.url),303);
  try { await assertPermission(user.id,"service.create"); } catch { return new NextResponse("Forbidden",{status:403}); }
  const f=await req.formData(); const parsed=schema.safeParse(Object.fromEntries(f)); if(!parsed.success) return new NextResponse("Invalid form",{status:400});
  const db=createAdminClient();
  const {data:fields,error:fieldsError}=await db.from("field_config").select("*").eq("section_key","service_create").eq("enabled",true).eq("is_custom",true);
  if(fieldsError) return new NextResponse(fieldsError.message,{status:500});
  const custom_fields:Record<string,string>={};
  for(const field of fields??[]){const val=String(f.get(`custom_${field.field_key}`)??"").trim();if(field.required&&!val)return new NextResponse(`${field.display_name} is required`,{status:400});if(field.field_type==="number"&&val&&!Number.isFinite(Number(val)))return new NextResponse(`Invalid ${field.display_name}`,{status:400});if(field.field_type==="select"&&val&&(!Array.isArray(field.options)||!field.options.includes(val)))return new NextResponse(`Invalid ${field.display_name}`,{status:400});if(val)custom_fields[field.field_key]=val;}
  const {data:existing}=await db.from("service_records").select("id").eq("serial_number",parsed.data.serial_number).neq("current_status","CLOSED").maybeSingle();
  if(existing) return new NextResponse("An active service record already exists for this serial number.",{status:409});
  const {data,error}=await db.from("service_records").insert({...parsed.data,custom_fields,tat_status:parsed.data.warranty_status==="OUT_OF_WARRANTY"?"OUT_OF_WARRANTY":"OPEN",current_status:"MATERIAL_RECEIVED",created_by:user.id,updated_by:user.id}).select("id").single();
  if(error) return new NextResponse(error.message,{status:400});
  await db.from("status_history").insert({service_record_id:data.id,status:"MATERIAL_RECEIVED",changed_by:user.id,notes:"Service record created"});
  await db.from("audit_logs").insert({user_id:user.id,entity_type:"service_record",entity_id:data.id,action:"CREATE",new_data:parsed.data});
  return NextResponse.redirect(new URL(`/services/${data.id}`,req.url),303);
}
