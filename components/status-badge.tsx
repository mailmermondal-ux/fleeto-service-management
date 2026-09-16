import { STATUS_LABEL, type ServiceStatus } from "@/lib/types";
const tones: Record<string,string> = {
  CLOSED: "bg-zinc-900 text-white",
  MATERIAL_RECEIVED: "bg-red-50 text-red-800",
  TESTING_STARTED: "bg-red-100 text-red-900",
  SEND_TO_SUPPLIER_END: "bg-zinc-100 text-zinc-800",
  IN_TRANSIT_TO_SUPPLIER: "bg-red-50 text-red-800",
  UNDER_SERVICING: "bg-red-100 text-red-900",
  SERVICING_COMPLETED: "bg-zinc-100 text-zinc-800",
  IN_TRANSIT_TO_FACTORY: "bg-red-50 text-red-800"
};
export function StatusBadge({ status }: { status: ServiceStatus }) {
  return <span className={`badge ${tones[status] || "bg-slate-100 text-slate-700"}`}>{STATUS_LABEL[status]}</span>;
}
