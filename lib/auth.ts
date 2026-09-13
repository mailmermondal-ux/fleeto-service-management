import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getPermissions(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_user_permissions", { p_user_id: userId });
  if (error) throw error;
  return new Set((data ?? []).map((x: { permission_code: string }) => x.permission_code));
}

export async function assertPermission(userId: string, permission: string) {
  const perms = await getPermissions(userId);
  if (!perms.has(permission)) throw new Error("FORBIDDEN");
}
