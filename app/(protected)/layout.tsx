import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/nav";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="min-h-screen lg:flex"><Nav/><main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main></div>;
}
