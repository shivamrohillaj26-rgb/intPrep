// =============================================
// QUESTION 2 - USER AUTHENTICATION
// FILE: guard/auth.guard.ts
//
// APPROACH:
// - Implements CanActivate
// - Only blocks /profile if not logged in
// - Redirects to / if blocked
// - Allows / route always (login page)
//
// INTERVIEW TIP:
// AuthGuard is applied to BOTH routes in app.module.ts
// So the guard must check WHICH route is being accessed
// before deciding to block or allow
// =============================================

import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { AppService } from '../app.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private appService: AppService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // Block /profile if not logged in → redirect to /
    if (state.url === '/profile' && !this.appService.isLoggedIn()) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
