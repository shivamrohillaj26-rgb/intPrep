import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { JwtAuthService } from './jwt-auth.service';

/** Attach Authorization: Bearer <jwt> on every HTTP call */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(JwtAuthService).getToken();
  if (!token) return next(req);

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
