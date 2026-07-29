import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { JwtAuthService } from './jwt-auth.service';

@Component({
  selector: 'app-jwt-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './jwt-shell.html',
  styleUrl: './jwt-shell.css',
})
export class JwtShell {
  auth = inject(JwtAuthService);

  logout() {
    this.auth.logout();
  }
}
