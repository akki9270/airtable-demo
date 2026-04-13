import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AirtableAuthService } from '../services/airtable-auth.service';
import { environment } from '../../environments/environment';

export const airtableAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AirtableAuthService);
  const router = inject(Router);

  const isAirtableApiCall = req.url.startsWith(environment.airtable.apiBaseUrl);
  const isSyncCall = req.url.startsWith('/api/sync');

  if (!isAirtableApiCall && !isSyncCall) return next(req);

  const token = authService.getToken();
  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        authService.logout();
        router.navigate(['/connect']);
      }
      return throwError(() => err);
    })
  );
};
