import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JwtAuthService } from './jwt-auth.service';
import { Role } from './models';

/**
 * Role guard — route.data['roles'] = ['admin']
 * Usage: canActivate: [jwtAuthGuard, roleGuard]
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(JwtAuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/q9/login']);
  }

  const allowed = (route.data['roles'] as Role[] | undefined) ?? [];
  if (allowed.length === 0 || auth.hasAnyRole(allowed)) return true;

  // logged in but wrong role
  return router.createUrlTree(['/q9/dashboard']);
};
