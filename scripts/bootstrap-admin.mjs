import { createClient } from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const email=process.env.BOOTSTRAP_ADMIN_EMAIL, password=process.env.BOOTSTRAP_ADMIN_PASSWORD, full_name=process.env.BOOTSTRAP_ADMIN_NAME||"System Administrator";
if(!url||!key||!email||!password){console.error("Missing Supabase or BOOTSTRAP_ADMIN_* environment variables.");process.exit(1)}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
let userId;
const {data:create,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name}});
if(error){
  const {data:list}=await db.auth.admin.listUsers({page:1,perPage:1000}); const existing=list.users.find(u=>u.email?.toLowerCase()===email.toLowerCase()); if(!existing) throw error; userId=existing.id;
}else userId=create.user.id;
await db.from("profiles").upsert({id:userId,email,full_name,is_active:true});
const {data:role,error:re}=await db.from("roles").select("id").eq("code","SUPER_ADMIN").single(); if(re)throw re;
const {error:ue}=await db.from("user_roles").upsert({user_id:userId,role_id:role.id,assigned_by:userId},{onConflict:"user_id,role_id"}); if(ue)throw ue;
console.log(`Super admin ready: ${email}`);
