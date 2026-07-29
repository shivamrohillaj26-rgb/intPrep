import { Component, inject } from '@angular/core';
import { JwtAuthService } from '../jwt-auth.service';

@Component({
  selector: 'app-jwt-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class JwtDashboard {
  auth = inject(JwtAuthService);
}
