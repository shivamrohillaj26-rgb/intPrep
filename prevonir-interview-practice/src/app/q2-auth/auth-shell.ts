import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
})
export class AuthShell {
  // public so template can call isLoggedIn()
  auth = inject(AuthService);
}
