import {NextResponse} from "next/server";
import {getCurrentUser,assertPermission} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {csv,dateRange,tatDays} from "@/lib/reporting";
export async function GET(req:Request){const user=await getCurrentUser();if(!user)return new NextResponse("Unauthorized",{status:401});try{await assertPermission(user.id,"reports.view")}catch{return new NextResponse("Forbidden",{status:403})}
 const p=new URL(req.url).searchParams;const from=p.get("from")||"",to=p.get("to")||"",type=p.get("type")||"";if(!dateRange(from,to)||!["detailed","presentation"].includes(type))return new NextResponse("Invalid date range or type",{status:400});
 const db=createAdminClient();const {data,error}=await db.from("service_records").select("*").gte("received_date_rnd",from).lte("received_date_rnd",to).order("received_date_rnd").limit(5000);if(error)return new NextResponse(error.message,{status:500});const records=data||[];
 let output:Record<string,unknown>[]=[];
 if(type==="presentation"){
 const group=p.get("group")||"supplier_name";if(!["supplier_name","distributor_name","dealer_name","received_date_rnd"].includes(group))return new NextResponse("Invalid group",{status:400});
 const grouped=new Map<string,{count:number,closed:number,sum:number,withTat:number}>();for(const r of records){const k=String(r[group]||"Unknown");const g=grouped.get(k)||{count:0,closed:0,sum:0,withTat:0};g.count++;if(r.current_status==="CLOSED")g.closed++;const t=tatDays(r);if(t!==null){g.sum+=t;g.withTat++;}grouped.set(k,g)}
 output=[...grouped].map(([key,g])=>({group:key,records:g.count,closed:g.closed,with_tat:g.withTat,average_tat_days:g.withTat?(g.sum/g.withTat).toFixed(2):""}));
 }else{
 const ids=records.map(r=>r.id);if(ids.length){const [{data:history},{data:logistics},{data:documents},{data:audit}]=await Promise.all([
 db.from("status_history").select("service_record_id,status,changed_at,notes,changed_by").in("service_record_id",ids).order("changed_at"),
 db.from("logistics_movements").select("*").in("service_record_id",ids),
 db.from("documents").select("service_record_id,document_type,original_name,uploaded_at,uploaded_by").in("service_record_id",ids),
 db.from("audit_logs").select("entity_id,action,created_at,user_id,old_data,new_data").eq("entity_type","service_record").in("entity_id",ids).order("created_at")]);
 output=records.map(r=>({...r,overall_tat_days:tatDays(r),status_history:JSON.stringify((history||[]).filter(h=>h.service_record_id===r.id)),logistics:JSON.stringify((logistics||[]).filter(x=>x.service_record_id===r.id)),documents:JSON.stringify((documents||[]).filter(x=>x.service_record_id===r.id)),activities:JSON.stringify((audit||[]).filter(x=>x.entity_id===r.id))}));
 } }
 return new NextResponse(csv(output),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="fleeto-${type}-${from}-to-${to}.csv"`,"Cache-Control":"no-store"}});
}
