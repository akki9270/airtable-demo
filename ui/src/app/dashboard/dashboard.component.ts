import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ModuleRegistry,
  ColDef,
  GridOptions,
} from 'ag-grid-community';
import { AirtableAuthService } from '../services/airtable-auth.service';
import {
  AirtableApiService,
  AirtableBase,
  AirtableTable,
  AirtableRecord,
  AirtableUser,
} from '../services/airtable-api.service';
import { ActionCellRendererComponent } from './action-cell-renderer.component';

ModuleRegistry.registerModules([AllCommunityModule]);

type ActiveView = 'bases' | 'users' | 'tables' | 'records' | null;

interface Breadcrumb {
  label: string;
  view: ActiveView;
  baseId?: string;
  tableId?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    AgGridAngular,
  ],
  template: `
    <div class="dashboard">
      <!-- Topbar -->
      <header class="topbar">
        <h1 class="app-title">
          <span class="material-icons">dashboard</span>
          Airtable Dashboard
        </h1>
        <button mat-stroked-button class="disconnect-btn" (click)="logout()">
          <span class="material-icons">logout</span>
          Disconnect
        </button>
      </header>

      <main class="content">
        <!-- Action buttons -->
        <div class="action-bar" *ngIf="!activeView || activeView === 'bases' || activeView === 'users'">
          <button mat-raised-button class="fetch-btn"
            [class.active]="activeView === 'bases'"
            [disabled]="loading"
            (click)="fetchBases()">
            <span class="material-icons">storage</span>
            Fetch Bases
          </button>
          <button mat-raised-button class="fetch-btn"
            [class.active]="activeView === 'users'"
            [disabled]="loading"
            (click)="fetchUsers()">
            <span class="material-icons">people</span>
            Fetch Users
          </button>
        </div>

        <!-- Breadcrumbs -->
        <nav class="breadcrumbs" *ngIf="breadcrumbs.length > 0">
          <ng-container *ngFor="let crumb of breadcrumbs; let last = last; let i = index">
            <button class="crumb" [class.crumb-active]="last" [disabled]="last" (click)="navigateTo(i)">
              {{ crumb.label }}
            </button>
            <span class="crumb-sep" *ngIf="!last">
              <span class="material-icons">chevron_right</span>
            </span>
          </ng-container>
        </nav>

        <!-- Loading -->
        <div class="state-container" *ngIf="loading">
          <mat-spinner diameter="40"></mat-spinner>
          <p class="state-text">Loading {{ viewLabel }}…</p>
        </div>

        <!-- Error -->
        <div class="state-container" *ngIf="error && !loading">
          <span class="material-icons error-icon">error_outline</span>
          <p class="state-text error-text">{{ error }}</p>
        </div>

        <!-- Grid -->
        <div class="grid-container" *ngIf="!loading && !error && rowData.length > 0">
          <div class="grid-header">
            <span class="material-icons grid-icon">{{ gridIcon }}</span>
            <h2 class="grid-title">{{ gridTitle }}</h2>
            <span class="grid-count">Page {{ currentPage }}</span>
          </div>

          <ag-grid-angular
            class="ag-theme-quartz"
            [rowData]="rowData"
            [columnDefs]="columnDefs"
            [gridOptions]="gridOptions"
            style="width: 100%; height: 420px;"
          />

          <!-- Custom pagination bar -->
          <div class="pagination-bar">
            <div class="page-size-selector">
              <span class="pg-label">Rows per page:</span>
              <select class="pg-select" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                <option *ngFor="let s of pageSizeOptions" [value]="s">{{ s }}</option>
              </select>
            </div>

            <div class="page-controls">
              <button class="pg-btn" [disabled]="currentPage === 1 || loading" (click)="prevPage()">
                <span class="material-icons">chevron_left</span>
              </button>
              <span class="page-indicator">Page {{ currentPage }}</span>
              <button class="pg-btn" [disabled]="!hasNextPage || loading" (click)="nextPage()">
                <span class="material-icons">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div class="state-container" *ngIf="!loading && !error && activeView && rowData.length === 0">
          <span class="material-icons empty-icon">inbox</span>
          <p class="state-text">No records found.</p>
        </div>

        <!-- Initial prompt -->
        <div class="state-container" *ngIf="!activeView && !loading">
          <span class="material-icons empty-icon">touch_app</span>
          <p class="state-text">Select a data source above to get started.</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; min-height: 100vh; background: #f5f6fa; }

    /* ── Topbar ── */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 32px; background: #4c51bf; color: #fff;
    }
    .app-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 20px; font-weight: 700; margin: 0;
    }
    .disconnect-btn { color: #fff !important; border-color: rgba(255,255,255,0.5) !important; }

    /* ── Content ── */
    .content { flex: 1; padding: 32px; max-width: 1200px; width: 100%; margin: 0 auto; }

    /* ── Action bar ── */
    .action-bar { display: flex; gap: 12px; margin-bottom: 20px; }
    .fetch-btn {
      background: #fff !important; color: #4c51bf !important;
      border: 2px solid #4c51bf !important; border-radius: 8px !important;
      padding: 8px 20px !important; font-weight: 600 !important; font-size: 14px !important;
      display: flex; align-items: center; gap: 6px; transition: all 0.15s ease;
    }
    .fetch-btn:hover:not(:disabled) { background: #eef0ff !important; }
    .fetch-btn.active { background: #4c51bf !important; color: #fff !important; }
    .fetch-btn:disabled { opacity: 0.5; }

    /* ── Breadcrumbs ── */
    .breadcrumbs {
      display: flex; align-items: center; gap: 2px; margin-bottom: 20px;
      background: #fff; border-radius: 8px; padding: 10px 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .crumb {
      display: inline-flex; align-items: center; background: none; border: none;
      color: #4c51bf; font-size: 14px; font-weight: 600; cursor: pointer;
      padding: 4px 6px; border-radius: 4px; transition: background 0.1s;
    }
    .crumb:hover:not(:disabled) { background: #eef0ff; }
    .crumb.crumb-active { color: #1a1a2e; cursor: default; }
    .crumb-sep .material-icons { font-size: 18px; color: #bbb; vertical-align: middle; }

    /* ── States ── */
    .state-container {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 60px 0; gap: 14px;
    }
    .state-text { font-size: 15px; color: #666; margin: 0; }
    .error-icon { font-size: 40px; color: #e53935; }
    .error-text { color: #e53935; }
    .empty-icon { font-size: 40px; color: #bbb; }

    /* ── Grid ── */
    .grid-container {
      background: #fff; border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.07); overflow: hidden;
    }
    .grid-header {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 20px; border-bottom: 1px solid #eee;
    }
    .grid-icon { color: #4c51bf; font-size: 22px; }
    .grid-title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; flex: 1; }
    .grid-count {
      font-size: 12px; color: #888; background: #f0f4ff;
      padding: 3px 10px; border-radius: 12px;
    }

    /* ── Pagination bar ── */
    .pagination-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; border-top: 1px solid #eee;
    }
    .page-size-selector { display: flex; align-items: center; gap: 10px; }
    .pg-label { font-size: 13px; color: #666; }
    .pg-select {
      border: 1px solid #ddd; border-radius: 6px; padding: 4px 8px;
      font-size: 13px; color: #333; background: #fff; cursor: pointer;
      outline: none;
    }
    .pg-select:focus { border-color: #4c51bf; }
    .page-controls { display: flex; align-items: center; gap: 8px; }
    .pg-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 6px;
      background: #fff; cursor: pointer; transition: all 0.15s;
      color: #4c51bf;
    }
    .pg-btn:hover:not(:disabled) { background: #eef0ff; border-color: #4c51bf; }
    .pg-btn:disabled { opacity: 0.4; cursor: default; }
    .pg-btn .material-icons { font-size: 18px; }
    .page-indicator { font-size: 13px; color: #333; font-weight: 600; min-width: 60px; text-align: center; }
  `],
})
export class DashboardComponent {
  activeView: ActiveView = null;
  loading = false;
  error: string | null = null;
  rowData: unknown[] = [];
  columnDefs: ColDef[] = [];
  breadcrumbs: Breadcrumb[] = [];

  // Pagination state
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  currentPage = 1;
  hasNextPage = false;
  // Stack of offsets: index 0 = page 1 (no offset), index N = offset to reach page N+1
  private offsetStack: (string | undefined)[] = [undefined];

  // Context for drill-down
  private selectedBaseId: string | null = null;
  private selectedTableId: string | null = null;
  private selectedBaseName: string | null = null;

  // Dynamic column defs for records view (rebuilt on first page load)
  private recordColumnDefs: ColDef[] = [];

  gridOptions: GridOptions = {
    defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1, minWidth: 120 },
    suppressPaginationPanel: true,
    context: {},
  };

  constructor(
    private authService: AirtableAuthService,
    private apiService: AirtableApiService,
  ) {}

  get viewLabel(): string {
    return this.activeView ?? '';
  }

  get gridTitle(): string {
    return this.breadcrumbs[this.breadcrumbs.length - 1]?.label ?? '';
  }

  get gridIcon(): string {
    const icons: Record<string, string> = {
      bases: 'storage', users: 'people', tables: 'table_chart', records: 'receipt_long',
    };
    return this.activeView ? icons[this.activeView] : 'table_chart';
  }

  // ── Page size change — reset to page 1 ──────────────────────────────────────

  onPageSizeChange(): void {
    this.resetPagination();
    this.loadCurrentView();
  }

  // ── Prev / Next ──────────────────────────────────────────────────────────────

  prevPage(): void {
    if (this.currentPage <= 1) return;
    this.currentPage--;
    // For records: pop the last offset so we use the previous page's cursor.
    // For bases: client-side pagination, offset stack is unused — just decrement page.
    if (this.activeView === 'records') {
      this.offsetStack.pop();
    }
    this.loadCurrentView();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;
    this.currentPage++;
    this.loadCurrentView();
  }

  // ── Breadcrumb navigation ────────────────────────────────────────────────────

  navigateTo(index: number): void {
    const crumb = this.breadcrumbs[index];
    if (!crumb) return;
    this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);
    this.resetPagination();

    if (crumb.view === 'bases') {
      this.startFetchBases(false);
    } else if (crumb.view === 'tables' && crumb.baseId) {
      this.startFetchTables(crumb.baseId, this.selectedBaseName ?? crumb.baseId, false);
    }
  }

  // ── Fetch Bases ──────────────────────────────────────────────────────────────

  fetchBases(): void {
    this.resetPagination();
    this.startFetchBases(true);
  }

  private startFetchBases(resetBreadcrumbs: boolean): void {
    this.activeView = 'bases';
    this.error = null;

    if (resetBreadcrumbs) {
      this.breadcrumbs = [{ label: 'Bases', view: 'bases' }];
    }

    this.gridOptions = {
      ...this.gridOptions,
      context: {
        actionLabel: 'View Tables',
        onAction: (row: AirtableBase) => {
          this.selectedBaseId = row.id;
          this.selectedBaseName = row.name;
          this.resetPagination();
          this.startFetchTables(row.id, row.name, true);
        },
      },
    };

    this.columnDefs = [
      { field: 'id', headerName: 'Base ID', minWidth: 200 },
      { field: 'name', headerName: 'Name', minWidth: 200 },
      { field: 'permissionLevel', headerName: 'Permission Level', minWidth: 160 },
      {
        headerName: 'Actions', cellRenderer: ActionCellRendererComponent,
        sortable: false, filter: false, flex: 0, width: 150,
      },
    ];

    this.loadBasesPage();
  }

  private loadBasesPage(): void {
    this.loading = true;
    this.rowData = [];

    // Bases use client-side pagination (API doesn't support pageSize on /meta/bases)
    this.apiService.getBasesPage(this.pageSize, this.currentPage).subscribe({
      next: (result) => {
        this.rowData = result.items;
        this.hasNextPage = !!result.nextOffset;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error?.message ?? 'Failed to fetch bases.';
        this.loading = false;
      },
    });
  }

  // ── Fetch Users ──────────────────────────────────────────────────────────────

  fetchUsers(): void {
    this.activeView = 'users';
    this.loading = true;
    this.error = null;
    this.rowData = [];
    this.breadcrumbs = [{ label: 'Users', view: 'users' }];
    this.hasNextPage = false;

    this.gridOptions = { ...this.gridOptions, context: {} };
    this.columnDefs = [
      { field: 'id', headerName: 'User ID', minWidth: 200 },
      { field: 'name', headerName: 'Name', minWidth: 180 },
      { field: 'email', headerName: 'Email', minWidth: 220 },
    ];

    // Users endpoint returns a single object — no pagination needed
    this.apiService.getCurrentUser().subscribe({
      next: (user: AirtableUser) => { this.rowData = [user]; this.loading = false; },
      error: (err) => {
        this.error = err?.error?.error?.message ?? 'Failed to fetch user.';
        this.loading = false;
      },
    });
  }

  // ── Fetch Tables ─────────────────────────────────────────────────────────────

  private startFetchTables(baseId: string, baseName: string, pushCrumb: boolean): void {
    this.activeView = 'tables';
    this.error = null;
    this.selectedBaseId = baseId;

    if (pushCrumb) {
      this.breadcrumbs = [
        { label: 'Bases', view: 'bases' },
        { label: `Tables in "${baseName}"`, view: 'tables', baseId },
      ];
    }

    this.gridOptions = {
      ...this.gridOptions,
      context: {
        actionLabel: 'View Records',
        onAction: (row: AirtableTable) => {
          this.selectedTableId = row.id;
          this.resetPagination();
          this.startFetchRecords(baseId, row.id, row.name, baseName, true);
        },
      },
    };

    this.columnDefs = [
      { field: 'id', headerName: 'Table ID', minWidth: 200 },
      { field: 'name', headerName: 'Table Name', minWidth: 200 },
      { field: 'primaryFieldId', headerName: 'Primary Field ID', minWidth: 200 },
      {
        headerName: 'Fields', flex: 0, width: 90, sortable: false, filter: false,
        valueGetter: (p) => (p.data as AirtableTable)?.fields?.length ?? 0,
      },
      {
        headerName: 'Actions', cellRenderer: ActionCellRendererComponent,
        sortable: false, filter: false, flex: 0, width: 150,
      },
    ];

    // Tables list is small — no server-side pagination needed
    this.loading = true;
    this.rowData = [];
    this.apiService.getTables(baseId).subscribe({
      next: (tables) => { this.rowData = tables; this.hasNextPage = false; this.loading = false; },
      error: (err) => {
        this.error = err?.error?.error?.message ?? 'Failed to fetch tables.';
        this.loading = false;
      },
    });
  }

  // ── Fetch Records ─────────────────────────────────────────────────────────────

  private startFetchRecords(
    baseId: string, tableId: string,
    tableName: string, baseName: string,
    pushCrumb: boolean,
  ): void {
    this.activeView = 'records';
    this.error = null;
    this.selectedBaseId = baseId;
    this.selectedTableId = tableId;
    this.selectedBaseName = baseName;

    if (pushCrumb) {
      this.breadcrumbs = [
        { label: 'Bases', view: 'bases' },
        { label: `Tables in "${baseName}"`, view: 'tables', baseId },
        { label: `Records in "${tableName}"`, view: 'records', baseId, tableId },
      ];
    }

    this.gridOptions = { ...this.gridOptions, context: {} };

    // Sync ALL records for this table into the DB in the background (full fetch via
    // fetchAllPages), independent of the paginated display below.
    this.apiService.getTickets(baseId, tableId).subscribe();

    this.loadRecordsPage(baseId, tableId);
  }

  private loadRecordsPage(baseId: string, tableId: string): void {
    this.loading = true;
    this.rowData = [];
    const offset = this.offsetStack[this.currentPage - 1];

    this.apiService.getTicketsPage(baseId, tableId, this.pageSize, offset).subscribe({
      next: (result) => {
        if (result.items.length === 0) {
          this.rowData = [];
          this.hasNextPage = false;
          this.loading = false;
          return;
        }

        // Build column defs from field keys on page 1; reuse on subsequent pages
        if (this.currentPage === 1 || this.recordColumnDefs.length === 0) {
          const fieldKeys = Object.keys(result.items[0].fields);
          this.recordColumnDefs = [
            { field: 'id', headerName: 'Record ID', minWidth: 180 },
            { field: 'createdTime', headerName: 'Created', minWidth: 180 },
            ...fieldKeys.map(key => ({
              headerName: key,
              minWidth: 140,
              valueGetter: (p: { data: AirtableRecord }) => p.data?.fields?.[key] ?? '',
            })),
          ];
        }
        this.columnDefs = this.recordColumnDefs;
        this.rowData = result.items;
        this.hasNextPage = !!result.nextOffset;
        if (result.nextOffset) {
          this.offsetStack[this.currentPage] = result.nextOffset;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error?.message ?? 'Failed to fetch records.';
        this.loading = false;
      },
    });
  }

  // ── Reload current view after page size change ───────────────────────────────

  private loadCurrentView(): void {
    if (this.activeView === 'bases') {
      this.loadBasesPage();
    } else if (this.activeView === 'records' && this.selectedBaseId && this.selectedTableId) {
      this.loadRecordsPage(this.selectedBaseId, this.selectedTableId);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private resetPagination(): void {
    this.currentPage = 1;
    this.hasNextPage = false;
    this.offsetStack = [undefined];
    this.recordColumnDefs = [];
  }

  logout(): void {
    this.authService.logout();
  }
}
