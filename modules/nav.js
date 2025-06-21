import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './header.js';
import './query-models.js';
import { picocss } from './style.js';
export class Nav extends LitElement {
  
  static styles = [picocss, css`
        .md-nav-query-models {
          min-width: 20rem;
        }
  `];
  
  render() {
    return html`
      <nav>
        <ul>
          <li>
            <strong><md-header></md-header></strong>
          </li>
        </ul>
        <ul>
          <li class="md-nav-query-models">
            <md-query-models></md-query-models>
          </li>
        </ul>
        <ul>
          <li>
            <a alt="Github" href="https://github.com/freedomson/midinho">
              <img id="github-logo" width="20" src="./css/github.png">
            </a>
          </li>
        </ul>
      </nav>
    `;
  }
}
customElements.define('md-nav', Nav);
