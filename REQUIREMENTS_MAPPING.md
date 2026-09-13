# Requirements Mapping

This file maps the supplied Service Material / Battery Management requirements to the implementation.

| Requirement | Implementation |
|---|---|
| Unique active record by Serial Number | Partial unique PostgreSQL index + API pre-check |
| Mandatory receipt fields | Required UI fields + server validation + NOT NULL database columns |
| Material Received initial status | Created automatically on service record creation |
| Testing Started timestamps | `testing_started_at` populated by workflow action |
| Mandatory test report | Private Supabase Storage upload required during testing completion |
| OK / No Defect route | Requires Return Date, records Same Return status, then closes |
| Defective route | Moves to Send to Supplier End then outbound logistics |
| Supplier logistics | Separate `TO_SUPPLIER` logistics row with company, tracking, ETA, dispatch |
| Supplier receipt | Date validation; history records Received at Supplier End then Under Servicing |
| RCA mandatory | Required file upload before Servicing Completed |
| Repair details | Completion date, repair action, replaced components, supplier remarks |
| Supplier return logistics | Separate `TO_FACTORY` logistics row |
| Factory receipt | Validated date, records Battery Received at Factory, then closes |
| TAT | UI calculations + SQL reporting view `service_record_tat` |
| Invalid date sequences | UI/API checks plus key PostgreSQL CHECK constraints |
| Closed records controlled | Normal workflow has no closed-record edit path; admin-edit permission reserved |
| Status audit history | Append-only `status_history` events from workflow actions |
| User/date audit | `audit_logs`, creator/updater fields and status actor timestamps |
| Documents retained | `documents` table + private `service-documents` storage bucket |
| Dashboard | Recent records, open/closed metrics, status visibility |
| User types / role management | Users, custom roles, role-permission mappings, role assignment/removal and activation |
| Role separation | Distinct permissions for testing, supplier dispatch, supplier service and factory receipt |
