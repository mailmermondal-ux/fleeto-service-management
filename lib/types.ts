export const STATUSES = [
  "MATERIAL_RECEIVED",
  "TESTING_STARTED",
  "MATERIAL_OK_SAME_RETURN",
  "SEND_TO_SUPPLIER_END",
  "IN_TRANSIT_TO_SUPPLIER",
  "RECEIVED_AT_SUPPLIER_END",
  "UNDER_SERVICING",
  "SERVICING_COMPLETED",
  "RETURNING_FROM_SUPPLIER_END",
  "IN_TRANSIT_TO_FACTORY",
  "BATTERY_RECEIVED_AT_FACTORY",
  "CLOSED"
] as const;
export type ServiceStatus = typeof STATUSES[number];

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  MATERIAL_RECEIVED: "Material Received",
  TESTING_STARTED: "Testing Started",
  MATERIAL_OK_SAME_RETURN: "Material OK - Same Return",
  SEND_TO_SUPPLIER_END: "Send to Supplier End",
  IN_TRANSIT_TO_SUPPLIER: "In Transit to Supplier",
  RECEIVED_AT_SUPPLIER_END: "Received at Supplier End",
  UNDER_SERVICING: "Under Servicing",
  SERVICING_COMPLETED: "Servicing Completed",
  RETURNING_FROM_SUPPLIER_END: "Returning from Supplier End",
  IN_TRANSIT_TO_FACTORY: "In Transit to Factory",
  BATTERY_RECEIVED_AT_FACTORY: "Battery Received at Factory",
  CLOSED: "Closed"
};

export type ServiceRecord = {
  id: string; serial_number: string; material_description: string; received_date_rnd: string;
  supplier_name: string; distributor_name: string; dealer_name: string; sale_date: string;
  defined_issue: string; current_status: ServiceStatus; material_condition: "OK" | "DEFECTIVE" | null;
  testing_started_at: string | null; testing_completed_at: string | null; return_date: string | null;
  supplier_receiving_date: string | null; servicing_completion_date: string | null;
  repair_action: string | null; replaced_components: string | null; supplier_remarks: string | null;
  factory_receiving_date: string | null; created_at: string; updated_at: string; created_by: string;
};
