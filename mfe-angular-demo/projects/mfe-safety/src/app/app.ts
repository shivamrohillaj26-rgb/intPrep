import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div style="padding: 1rem; font-family: system-ui, sans-serif">
      <p style="margin: 0 0 1rem; color: #666">
        mfe-safety standalone · normally loaded by shell at /safety
      </p>
      <router-outlet />
    </div>
  `,
})
export class App {}
