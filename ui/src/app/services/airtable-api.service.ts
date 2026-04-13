import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, expand, reduce, EMPTY } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MongoSyncService } from './mongo-sync.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

export interface AirtableUser {
  id: string;
  email: string;
  name: string;
}

// ── Public page result shape ─────────────────────────────────────────────────

export interface PageResult<T> {
  items: T[];
  nextOffset?: string;
}

// ── Private response shapes ──────────────────────────────────────────────────

interface BasesResponse {
  bases: AirtableBase[];
  offset?: string;
}

interface TablesResponse {
  tables: AirtableTable[];
}

interface RecordsResponse {
  records: AirtableRecord[];
  offset?: string;
}

@Injectable({ providedIn: 'root' })
export class AirtableApiService {
  private readonly base = environment.airtable.apiBaseUrl;

  constructor(private http: HttpClient, private sync: MongoSyncService) {}

  // ── Projects (bases) — GET /meta/bases ──────────────────────────────────────

  getBases(): Observable<AirtableBase[]> {
    return this.fetchAllPages<AirtableBase, BasesResponse>(
      `${this.base}/meta/bases`,
      res => res.bases,
      res => res.offset
    ).pipe(
      tap(items => this.sync.syncBases(items).subscribe())
    );
  }

  // /meta/bases does not support pageSize — fetch all and slice client-side.
  getBasesPage(pageSize: number, page: number): Observable<PageResult<AirtableBase>> {
    return this.getBases().pipe(
      map(all => {
        const start = (page - 1) * pageSize;
        const items = all.slice(start, start + pageSize);
        return { items, nextOffset: start + pageSize < all.length ? 'client' : undefined };
      })
    );
  }

  // ── Tables — GET /meta/bases/{baseId}/tables ────────────────────────────────

  getTables(baseId: string): Observable<AirtableTable[]> {
    return this.http
      .get<TablesResponse>(`${this.base}/meta/bases/${baseId}/tables`)
      .pipe(
        map(res => res.tables),
        tap(items => this.sync.syncTables(baseId, items).subscribe())
      );
  }

  // ── Tickets / records (pages) — GET /{baseId}/{tableId} ─────────────────────

  getTickets(baseId: string, tableId: string): Observable<AirtableRecord[]> {
    return this.fetchAllPages<AirtableRecord, RecordsResponse>(
      `${this.base}/${baseId}/${tableId}`,
      res => res.records,
      res => res.offset
    ).pipe(
      tap(items => this.sync.syncRecords(baseId, tableId, items).subscribe())
    );
  }

  getTicketsPage(baseId: string, tableId: string, pageSize: number, offset?: string): Observable<PageResult<AirtableRecord>> {
    let params = new HttpParams().set('pageSize', pageSize);
    if (offset) params = params.set('offset', offset);
    return this.http
      .get<RecordsResponse>(`${this.base}/${baseId}/${tableId}`, { params })
      .pipe(
        tap(res => this.sync.syncRecords(baseId, tableId, res.records).subscribe()),
        map(res => ({ items: res.records, nextOffset: res.offset }))
      );
  }

  // ── Users — GET /meta/whoami ─────────────────────────────────────────────────

  getCurrentUser(): Observable<AirtableUser> {
    return this.http.get<AirtableUser>(`${this.base}/meta/whoami`);
  }

  // ── Pagination helper ────────────────────────────────────────────────────────
  // Airtable paginates using an `offset` cursor. This method keeps fetching
  // until no `offset` is returned, then flattens all pages into one array.

  private fetchAllPages<T, R>(
    url: string,
    getItems: (res: R) => T[],
    getOffset: (res: R) => string | undefined,
    params: HttpParams = new HttpParams()
  ): Observable<T[]> {
    const fetchPage = (offset?: string): Observable<R> => {
      const p = offset ? params.set('offset', offset) : params;
      return this.http.get<R>(url, { params: p });
    };

    return fetchPage().pipe(
      expand(res => {
        const offset = getOffset(res);
        return offset ? fetchPage(offset) : EMPTY;
      }),
      reduce((acc: T[], res: R) => [...acc, ...getItems(res)], [])
    );
  }
}
