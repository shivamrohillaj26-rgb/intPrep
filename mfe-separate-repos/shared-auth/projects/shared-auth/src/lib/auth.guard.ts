import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Shell owns route protection; remotes trust the host already authenticated. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  auth.hydrateFromSharedStore();

  if (auth.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/** Example role gate — admin-only fleet ops. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  auth.hydrateFromSharedStore();

  if (auth.isLoggedIn() && auth.hasRole('admin')) {
    return true;
  }
  return router.createUrlTree(['/home']);
};
