import { Routes } from '@angular/router';
import { SafetyHome } from './pages/safety-home';

/** Exposed to the shell as `./Routes` — host mounts under `/safety`. */
export const routes: Routes = [
  { path: '', component: SafetyHome },
];
