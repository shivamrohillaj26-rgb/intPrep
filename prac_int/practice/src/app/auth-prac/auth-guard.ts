import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if(authService.isLoggedIn) {
    return true;
  }
  console.log('User is not logged in');
  router.navigate(['/auth-prac/login']);
  return false;
};
