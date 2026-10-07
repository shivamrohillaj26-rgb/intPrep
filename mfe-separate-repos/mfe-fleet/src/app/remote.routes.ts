import { Routes } from '@angular/router';
import { adminGuard } from 'shared-auth';
import { FleetHome } from './pages/fleet-home';
import { FleetAdmin } from './pages/fleet-admin';

/** Exposed to the shell as `./Routes` — host mounts under `/fleet`. */
export const routes: Routes = [
  { path: '', component: FleetHome },
  {
    path: 'admin',
    canActivate: [adminGuard],
    component: FleetAdmin,
  },
];
