import { LitElement, html, css } from './node_modules/lit-element/lit-element.js'
import './header.js';
export class Nav extends LitElement {

  static styles = css``;

  render() {
    return html`
      <link rel="stylesheet" href="css/pico.sand.min.css">
      <nav>
        <ul>
          <md-header></md-header>
        </ul>
        <ul>
          <li><a alt="Github" href="https://github.com/freedomson/midinho"><img id="github-logo" width="20" src="./css/github.png"></a></li>
        </ul>
      </nav>
    `;
  }
}
customElements.define('md-nav', Nav);
