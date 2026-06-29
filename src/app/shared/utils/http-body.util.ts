import { HttpHeaders } from '@angular/common/http';

/** Backend PATCH endpoints expect a raw JSON Guid string, not `{ "field": "guid" }`. */
export function rawGuidBody(value: string | null): string {
  if (value === null || value === undefined || value === '') {
    return 'null';
  }
  return JSON.stringify(value);
}

export const JSON_HEADERS = new HttpHeaders({ 'Content-Type': 'application/json' });
