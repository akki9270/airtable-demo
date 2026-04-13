import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AirtableAuthService } from '../services/airtable-auth.service';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="page">
      <mat-card class="connect-card">
        <div class="logo-row">
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Airtable_Logo.svg"
               alt="Airtable" class="airtable-logo" />
        </div>

        <mat-card-content>
          <h1 class="headline">Connect to Airtable</h1>
          <p class="subtext">
            Grant access so we can sync your bases, tables, and tickets.
          </p>

          <ul class="scope-list">
            <li>
              <span class="material-icons scope-icon">table_chart</span>
              Read your bases &amp; table schemas
            </li>
            <li>
              <span class="material-icons scope-icon">receipt_long</span>
              Read records (tickets) from your tables
            </li>
            <li>
              <span class="material-icons scope-icon">person</span>
              Read your account email
            </li>
          </ul>
        </mat-card-content>

        <mat-card-actions>
          <button
            mat-raised-button
            class="connect-btn"
            [disabled]="connecting"
            (click)="connect()"
          >
            <span class="material-icons btn-icon">link</span>
            {{ connecting ? 'Redirecting…' : 'Connect Airtable' }}
          </button>
        </mat-card-actions>

        <p class="footer-note">
          You'll be redirected to Airtable to authorize access. We never store
          your Airtable password.
        </p>
      </mat-card>
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f6fa;
    }

    .connect-card {
      width: 420px;
      border-radius: 16px !important;
      padding: 32px 28px 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.10) !important;
    }

    .logo-row {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }

    .airtable-logo {
      height: 36px;
    }

    .headline {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 8px;
      text-align: center;
    }

    .subtext {
      font-size: 14px;
      color: #666;
      text-align: center;
      margin: 0 0 24px;
      line-height: 1.5;
    }

    .scope-list {
      list-style: none;
      padding: 0;
      margin: 0 0 28px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .scope-list li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #333;
      background: #f0f4ff;
      border-radius: 8px;
      padding: 10px 14px;
    }

    .scope-icon {
      font-size: 20px;
      color: #4c51bf;
    }

    mat-card-actions {
      display: flex !important;
      justify-content: center;
      padding: 0 !important;
      margin-bottom: 16px !important;
    }

    .connect-btn {
      background: #4c51bf !important;
      color: #fff !important;
      border-radius: 8px !important;
      padding: 10px 32px !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      justify-content: center;
    }

    .connect-btn:disabled {
      opacity: 0.6;
    }

    .btn-icon {
      font-size: 20px;
    }

    .footer-note {
      font-size: 12px;
      color: #999;
      text-align: center;
      margin: 0;
      line-height: 1.5;
    }
  `]
})
export class ConnectComponent {
  connecting = false;

  constructor(private authService: AirtableAuthService) {}

  async connect(): Promise<void> {
    this.connecting = true;
    await this.authService.login();
  }
}
