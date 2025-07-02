import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './header.js';
import './query-models.js';
import { picocss } from './style.js';
export class Nav extends LitElement {
  
  static styles = [picocss, css``];
  
  render() {
    return html`
      <md-header></md-header>
      <nav>
        <ul>
          <li>
              <md-query-models></md-query-models>
          </li>
        </ul>
        <ul>
          <li>
              <a alt="Github" href="https://github.com/freedomson/midinho">
                <img id="github-logo" width="20px" src="./css/github.png">
              </a>
          </li>
          <li>
              <a alt="Android" href="/static/midinho-app_apt-android-7-release_universal.apk">
                <img id="github-logo" width="20px" src="./css/android.svg">
              </a>
          </li>
        </ul>
      </nav>
    `;
  }
}
customElements.define('md-nav', Nav);
