import { NextResponse } from "next/server";
import { getCurrentUser, assertPermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser(); if(!user) return new NextResponse("Unauthorized",{status:401}); try{await assertPermission(user.id,"service.view")}catch{return new NextResponse("Forbidden",{status:403})}
  const {id}=await params; const docId=new URL(req.url).searchParams.get("document"); if(!docId) return new NextResponse("Missing document",{status:400}); const db=createAdminClient(); const {data:d}=await db.from("documents").select("*").eq("id",docId).eq("service_record_id",id).single(); if(!d)return new NextResponse("Not found",{status:404});
  const {data,error}=await db.storage.from("service-documents").createSignedUrl(d.storage_path,60); if(error)return new NextResponse(error.message,{status:400}); return NextResponse.redirect(data.signedUrl);
}
