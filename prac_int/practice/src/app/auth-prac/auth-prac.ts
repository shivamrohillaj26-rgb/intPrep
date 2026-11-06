import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth-service';

@Component({
  selector: 'app-auth-prac',
  imports: [RouterOutlet , RouterLink , RouterLinkActive],
  templateUrl: './auth-prac.html',
  styleUrl: './auth-prac.css',
})
export class AuthPrac {
  authService = inject(AuthService);

}
