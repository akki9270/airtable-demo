import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AirtableAuthService } from '../services/airtable-auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="callback-container">
      <ng-container *ngIf="!error; else errorTpl">
        <mat-spinner diameter="48"></mat-spinner>
        <p class="status-text">Connecting to Airtable...</p>
      </ng-container>
      <ng-template #errorTpl>
        <span class="material-icons error-icon">error_outline</span>
        <p class="error-text">{{ error }}</p>
        <button class="retry-btn" (click)="goBack()">Go back</button>
      </ng-template>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 20px;
    }
    .status-text { color: #555; font-size: 16px; }
    .error-icon { font-size: 48px; color: #e53935; }
    .error-text { color: #e53935; font-size: 15px; text-align: center; max-width: 360px; }
    .retry-btn {
      padding: 10px 24px;
      background: #4c51bf;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AirtableAuthService
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const errorParam = this.route.snapshot.queryParamMap.get('error');

    if (errorParam) {
      this.error = `Airtable returned an error: ${errorParam}`;
      return;
    }

    if (!code || !state) {
      this.error = 'Missing code or state in callback URL.';
      return;
    }

    try {
      this.authService.handleCallback(code, state).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: err => (this.error = err?.error?.error_description ?? 'Token exchange failed. Please try again.'),
      });
    } catch (e: any) {
      this.error = e.message;
    }
  }

  goBack(): void {
    this.router.navigate(['/connect']);
  }
}
