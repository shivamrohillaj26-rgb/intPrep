import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JwtAuthService } from './jwt-auth.service';

/** Must be logged in (valid non-expired JWT) */
export const jwtAuthGuard: CanActivateFn = () => {
  const auth = inject(JwtAuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  return router.createUrlTree(['/q9/login']);
};
