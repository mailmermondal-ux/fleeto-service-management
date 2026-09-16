import {differenceInCalendarDays,parseISO} from "date-fns";
export function tatDays(record:any){const end=record.factory_receiving_date||record.return_date;if(!end)return null;return differenceInCalendarDays(parseISO(end),parseISO(record.received_date_rnd));}
export function csv(rows:Record<string,unknown>[]){if(!rows.length)return "No records\r\n";const keys=Object.keys(rows[0]);const esc=(v:unknown)=>'"'+String(v??"").replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';return [keys.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\r\n');}
export function dateRange(from:string,to:string){return /^\d{4}-\d{2}-\d{2}$/.test(from)&&/^\d{4}-\d{2}-\d{2}$/.test(to)&&from<=to;}
