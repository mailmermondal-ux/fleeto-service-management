import { STATUS_LABEL, type ServiceStatus } from "@/lib/types";
const tones: Record<string,string> = {
  CLOSED: "bg-emerald-100 text-emerald-800",
  MATERIAL_RECEIVED: "bg-sky-100 text-sky-800",
  TESTING_STARTED: "bg-amber-100 text-amber-800",
  SEND_TO_SUPPLIER_END: "bg-orange-100 text-orange-800",
  IN_TRANSIT_TO_SUPPLIER: "bg-indigo-100 text-indigo-800",
  UNDER_SERVICING: "bg-fuchsia-100 text-fuchsia-800",
  SERVICING_COMPLETED: "bg-violet-100 text-violet-800",
  IN_TRANSIT_TO_FACTORY: "bg-cyan-100 text-cyan-800"
};
export function StatusBadge({ status }: { status: ServiceStatus }) {
  return <span className={`badge ${tones[status] || "bg-slate-100 text-slate-700"}`}>{STATUS_LABEL[status]}</span>;
}
