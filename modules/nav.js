import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './header.js';
import './query-models.js';
import { picocss } from './style.js';
export class Nav extends LitElement {

  static styles = [picocss,css`
    nav {
      text-align: center;
      display: block ruby;
    }
  `];

  render() {
    return html`
      <md-header></md-header>
      <nav>
        <ul>
          <li>
              <md-query-models></md-query-models>
          </li>
        </ul>
      </nav>
    `;
  }
}
customElements.define('md-nav', Nav);
