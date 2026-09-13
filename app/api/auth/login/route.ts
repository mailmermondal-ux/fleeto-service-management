import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || ""); const password = String(form.get("password") || "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return NextResponse.redirect(new URL(error ? "/login?error=1" : "/dashboard", req.url), 303);
}
