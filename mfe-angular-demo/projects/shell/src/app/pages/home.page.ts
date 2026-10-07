import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <section class="home">
      <h1>MFE demo shell</h1>
      <p>
        You are inside the <strong>host</strong>. Nav + auth + region filter stay here.
        Safety / Fleet pages are <strong>remotes</strong> loaded at runtime from other ports.
      </p>

      <ol>
        <li>Login once in the shell (already done if you see the header user).</li>
        <li>Change <em>Region</em> in the header — both remotes filter with that value.</li>
        <li>Open <a routerLink="/safety">Safety</a> (remote :4201) and
          <a routerLink="/fleet">Fleet</a> (remote :4202).</li>
        <li>Try <a routerLink="/fleet/admin">Fleet admin</a> as viewer → blocked by shell guard.</li>
      </ol>

      <h2>Interview map</h2>
      <table>
        <tr><th>Piece</th><th>Where</th></tr>
        <tr><td>Shell / host</td><td>this app · :4200</td></tr>
        <tr><td>Manifest</td><td><code>federation.manifest.json</code> → remoteEntry URLs</td></tr>
        <tr><td>Shared deps</td><td>Angular / RxJS as singletons via Native Federation</td></tr>
        <tr><td>Auth + region</td><td><code>shared-auth</code> library + shared session store</td></tr>
        <tr><td>Remote load</td><td><code>loadRemoteModule(name, './Routes')</code></td></tr>
      </table>
    </section>
  `,
  styles: [
    `
      .home {
        max-width: 720px;
      }
      h1 {
        margin: 0 0 0.5rem;
      }
      ol {
        line-height: 1.6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 0.5rem;
        font-size: 0.95rem;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 0.45rem 0.6rem;
        text-align: left;
      }
      th {
        background: #f3f3f3;
      }
      a {
        color: #1f4b99;
      }
    `,
  ],
})
export class HomePage {}
