import {NextResponse} from "next/server";
import {getCurrentUser,assertPermission} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)return new NextResponse("Unauthorized",{status:401});
 try{await assertPermission(user.id,"workflow.tat_manage")}catch{return new NextResponse("Forbidden",{status:403})}
 const {id}=await params;const f=await req.formData();const tat_status=String(f.get("tat_status")||"");const hold_reason=String(f.get("hold_reason")||"").trim();
 if(!["OPEN","HOLD","OUT_OF_WARRANTY"].includes(tat_status))return new NextResponse("Invalid TAT status",{status:400});
 if(tat_status==="HOLD"&&!hold_reason)return new NextResponse("Hold reason required",{status:400});
 const db=createAdminClient();const {data:record,error:readError}=await db.from("service_records").select("current_status,tat_status,hold_reason").eq("id",id).single();
 if(readError||!record)return new NextResponse("Not found",{status:404});if(record.current_status==="CLOSED")return new NextResponse("Closed service record",{status:409});
 const {error}=await db.from("service_records").update({tat_status,hold_reason:tat_status==="HOLD"?hold_reason:null,updated_by:user.id}).eq("id",id).neq("current_status","CLOSED");
 if(error)return new NextResponse(error.message,{status:400});
 await db.from("audit_logs").insert({user_id:user.id,entity_type:"service_record",entity_id:id,action:"TAT_STATUS_CHANGE",old_data:{tat_status:record.tat_status,hold_reason:record.hold_reason},new_data:{tat_status,hold_reason:tat_status==="HOLD"?hold_reason:null}});
 return NextResponse.redirect(new URL(`/services/${id}`,req.url),303);
}
