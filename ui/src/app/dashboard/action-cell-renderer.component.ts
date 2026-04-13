import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-action-cell',
  standalone: true,
  template: `
    <button class="action-btn" (click)="onClick()">
      <span class="material-icons">arrow_forward</span>
      {{ label }}
    </button>
  `,
  styles: [`
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      background: #4c51bf;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .action-btn:hover { background: #3c4099; }
    .material-icons { font-size: 14px; }
  `],
})
export class ActionCellRendererComponent implements ICellRendererAngularComp {
  label = 'View';
  private params!: ICellRendererParams;

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.label = params.context?.actionLabel ?? 'View';
  }

  refresh(): boolean { return false; }

  onClick(): void {
    this.params.context?.onAction?.(this.params.data);
  }
}
