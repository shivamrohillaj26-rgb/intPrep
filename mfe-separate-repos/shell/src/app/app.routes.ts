import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation-v4';
import { authGuard } from 'shared-auth';
import { HomePage } from './pages/home.page';
import { LoginPage } from './pages/login.page';

/**
 * Host routing = composition root.
 * - Local pages: login / home
 * - Federated pages: loadChildren from remotes' exposed `./Routes`
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'login', component: LoginPage },
  { path: 'home', canActivate: [authGuard], component: HomePage },
  {
    path: 'safety',
    canActivate: [authGuard],
    loadChildren: () =>
      loadRemoteModule('mfe-safety', './Routes').then((m) => m.routes),
  },
  {
    path: 'fleet',
    canActivate: [authGuard],
    loadChildren: () =>
      loadRemoteModule('mfe-fleet', './Routes').then((m) => m.routes),
  },
  { path: '**', redirectTo: 'home' },
];
