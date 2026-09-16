import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MobileNavigation } from "@/components/mobile-navigation";

export async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sections } = await createAdminClient()
    .from("section_config").select("section_key,display_name");
  const label = (key: string, fallback: string) =>
    sections?.find((section) => section.section_key === key)?.display_name || fallback;

  const items = [
    { href: "/dashboard", label: label("dashboard", "Dashboard") },
    { href: "/services", label: label("services", "Services") },
    { href: "/services/new", label: label("service_create", "New Service Record") },
    { href: "/masters", label: label("masters", "Masters") },
    { href: "/reporting", label: label("reporting", "Reporting") },
    { href: "/admin/config", label: "Configuration" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/roles", label: "Roles" },
    { href: "/audit", label: "Audit Trail" },
  ];

  return <MobileNavigation items={items} email={user?.email ?? ""} />;
}
