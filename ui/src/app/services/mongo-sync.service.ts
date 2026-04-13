import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, EMPTY } from 'rxjs';
import { AirtableBase, AirtableTable, AirtableRecord } from './airtable-api.service';

interface SyncResult {
  upserted: number;
  modified: number;
}

@Injectable({ providedIn: 'root' })
export class MongoSyncService {
  private readonly base = '/api/sync';

  constructor(private http: HttpClient) {}

  syncBases(items: AirtableBase[]): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.base}/bases`, { items }).pipe(
      catchError(err => { console.warn('[Sync] bases failed', err); return EMPTY; })
    );
  }

  syncTables(baseId: string, items: AirtableTable[]): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.base}/tables`, { baseId, items }).pipe(
      catchError(err => { console.warn('[Sync] tables failed', err); return EMPTY; })
    );
  }

  syncRecords(baseId: string, tableId: string, items: AirtableRecord[]): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.base}/records`, { baseId, tableId, items }).pipe(
      catchError(err => { console.warn('[Sync] records failed', err); return EMPTY; })
    );
  }
}
