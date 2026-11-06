import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'shared-auth';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  template: `
    <section class="login">
      <h1>Shell login</h1>
      <p>Auth lives in the <strong>host</strong>. Remotes never show this screen.</p>
      <form (ngSubmit)="submit()">
        <label>
          Username
          <input name="user" [(ngModel)]="username" autocomplete="username" />
        </label>
        <label>
          Password
          <input
            name="pass"
            type="password"
            [(ngModel)]="password"
            autocomplete="current-password"
          />
        </label>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button type="submit">Sign in</button>
      </form>
      <p class="hint">Try <code>admin / admin</code> or <code>viewer / viewer</code></p>
    </section>
  `,
  styles: [
    `
      .login {
        max-width: 380px;
        margin: 2rem auto;
        padding: 1.5rem;
        border: 1px solid #ddd;
        border-radius: 12px;
        background: #fff;
      }
      h1 {
        margin: 0 0 0.5rem;
        font-size: 1.4rem;
      }
      form {
        display: grid;
        gap: 0.75rem;
        margin-top: 1rem;
      }
      label {
        display: grid;
        gap: 0.25rem;
        font-size: 0.9rem;
      }
      input {
        padding: 0.5rem 0.65rem;
        border: 1px solid #ccc;
        border-radius: 6px;
      }
      button {
        margin-top: 0.25rem;
        padding: 0.6rem 0.9rem;
        border: 0;
        border-radius: 6px;
        background: #1f4b99;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }
      .error {
        color: #b00020;
        margin: 0;
      }
      .hint {
        margin-top: 1rem;
        color: #555;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = 'admin';
  password = 'admin';
  readonly error = signal('');

  submit(): void {
    const result = this.auth.login(this.username, this.password);
    if (!result.ok) {
      this.error.set(result.error);
      return;
    }
    void this.router.navigateByUrl('/home');
  }
}
