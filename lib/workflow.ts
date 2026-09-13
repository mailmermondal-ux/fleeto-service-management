import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ServiceRecord } from "./types";

export function daysBetween(end?: string | null, start?: string | null) {
  if (!end || !start) return null;
  return differenceInCalendarDays(parseISO(end), parseISO(start));
}

export function calculateTats(r: ServiceRecord, outbound?: any, inbound?: any) {
  const sameReturn = daysBetween(r.return_date, r.received_date_rnd);
  const overall = daysBetween(r.factory_receiving_date, r.received_date_rnd);
  const station = daysBetween(outbound?.dispatch_date, r.received_date_rnd);
  const supplier = daysBetween(inbound?.dispatch_date, r.supplier_receiving_date);
  const toSupplier = daysBetween(r.supplier_receiving_date, outbound?.dispatch_date);
  const toFactory = daysBetween(r.factory_receiving_date, inbound?.dispatch_date);
  return { sameReturn, overall, station, supplier, toSupplier, toFactory };
}
