import { Routes } from '@angular/router';
import { Home } from './home/home';
import { ResponsiveForm } from './q1-responsive-form/responsive-form';
import { AuthShell } from './q2-auth/auth-shell';
import { Login } from './q2-auth/login/login';
import { Profile } from './q2-auth/profile/profile';
import { authGuard } from './q2-auth/auth.guard';
import { MealPage } from './q3-meal/meal-page';
import { TypeaheadPage } from './q4-typeahead/typeahead-page';
import { ExpandList } from './q5-expand-list/expand-list';
import { ButtonDemo } from './q6-ui-button/button-demo';
import { VirtualList } from './q7-virtual-list/virtual-list';
import { FileExplorer } from './q8-file-explorer/file-explorer';
import { JwtShell } from './q9-jwt-auth/jwt-shell';
import { JwtLogin } from './q9-jwt-auth/login/jwt-login';
import { JwtDashboard } from './q9-jwt-auth/dashboard/dashboard';
import { JwtAdmin } from './q9-jwt-auth/admin/admin';
import { jwtAuthGuard } from './q9-jwt-auth/jwt-auth.guard';
import { roleGuard } from './q9-jwt-auth/role.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'q1', component: ResponsiveForm },
  {
    path: 'q2',
    component: AuthShell,
    children: [
      { path: '', component: Login },
      { path: 'profile', component: Profile, canActivate: [authGuard] },
    ],
  },
  { path: 'q3', component: MealPage },
  { path: 'q4', component: TypeaheadPage },
  { path: 'q5', component: ExpandList },
  { path: 'q6', component: ButtonDemo },
  { path: 'q7', component: VirtualList },
  { path: 'q8', component: FileExplorer },
  {
    path: 'q9',
    component: JwtShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: 'login', component: JwtLogin },
      {
        path: 'dashboard',
        component: JwtDashboard,
        canActivate: [jwtAuthGuard],
      },
      {
        path: 'admin',
        component: JwtAdmin,
        canActivate: [jwtAuthGuard, roleGuard],
        data: { roles: ['admin'] },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
