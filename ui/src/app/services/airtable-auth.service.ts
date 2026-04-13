import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

@Injectable({ providedIn: 'root' })
export class AirtableAuthService {
  private readonly TOKEN_KEY = 'airtable_access_token';
  private readonly VERIFIER_KEY = 'airtable_pkce_verifier';
  private readonly STATE_KEY = 'airtable_oauth_state';

  private _isAuthenticated = new BehaviorSubject<boolean>(this.hasValidToken());
  isAuthenticated$ = this._isAuthenticated.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // ── PKCE helpers ────────────────────────────────────────────────────────────

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => chars[b % chars.length]).join('');
  }

  // Generates a 128-char verifier from 96 random bytes (base64url), matching
  // Airtable's official OAuth example (crypto.randomBytes(96)).
  private generateVerifier(): string {
    const array = new Uint8Array(96);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array.buffer);
  }

  private async sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(plain));
  }

  private base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hashed = await this.sha256(verifier);
    return this.base64UrlEncode(hashed);
  }

  // ── Auth flow ────────────────────────────────────────────────────────────────

  async login(): Promise<void> {
    const verifier = this.generateVerifier();
    const state = this.generateRandomString(32);
    const challenge = await this.generateCodeChallenge(verifier);

    localStorage.setItem(this.VERIFIER_KEY, verifier);
    localStorage.setItem(this.STATE_KEY, state);
    console.debug('[Auth] Stored PKCE verifier and state in localStorage', {
      verifierLength: verifier.length,
      stateLength: state.length,
    });

    const params = new HttpParams()
      .set('client_id', environment.airtable.clientId)
      .set('redirect_uri', environment.airtable.redirectUri)
      .set('response_type', 'code')
      .set('scope', environment.airtable.scopes)
      .set('state', state)
      .set('code_challenge', challenge)
      .set('code_challenge_method', 'S256');

    window.location.href = `${environment.airtable.authUrl}?${params.toString()}`;
  }

  handleCallback(code: string, returnedState: string): Observable<TokenResponse> {
    const verifier = localStorage.getItem(this.VERIFIER_KEY);
    const savedState = localStorage.getItem(this.STATE_KEY);
    console.debug('[Auth] Callback received', {
      hasVerifier: !!verifier,
      stateMatch: returnedState === savedState,
      allLocalStorageKeys: Object.keys(localStorage),
    });

    if (!verifier) throw new Error('PKCE verifier not found — possible CSRF attack.');
    if (returnedState !== savedState) throw new Error('State mismatch — possible CSRF attack.');

    // Token exchange must go through a proxy because Airtable's token endpoint
    // does not support CORS. The Angular dev proxy forwards /airtable-token →
    // https://airtable.com/oauth2/v1/token
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('code', code)
      .set('redirect_uri', environment.airtable.redirectUri)
      .set('client_id', environment.airtable.clientId)
      .set('code_verifier', verifier);

    // Per Airtable's official example: only send Authorization header if a
    // client secret exists. For public PKCE-only clients, omit it entirely
    // and rely on client_id in the body instead.
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http.post<TokenResponse>('/airtable-token', body.toString(), { headers }).pipe(
      tap(res => {
        // Only clean up PKCE state and store the token after a successful exchange.
        // Removing them before the HTTP call would make retries impossible if the
        // request fails (as happened with the proxy 404 issue).
        localStorage.removeItem(this.VERIFIER_KEY);
        localStorage.removeItem(this.STATE_KEY);
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        this._isAuthenticated.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this._isAuthenticated.next(false);
    this.router.navigate(['/connect']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasValidToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }
}