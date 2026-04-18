import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import { picocss } from './style.js';
import { store } from './store.js';

export class MemoryInfo extends LitElement {

  static styles = [picocss, css`
    .meminfo {
      text-align: center;
      font-size: 0.9rem;
      opacity: 0.9;
      margin-top: 0.5rem;
    }
    .error {
      font-style: italic;
    }
  `];

  static properties = {
    endpoint: { type: String },
    intervalMs: { type: Number },
    freeMemoryMb: { type: Number },
    error: { type: String }
  };

  constructor() {
    super();
    this.endpoint = 'http://localhost:8081/free-memory';
    this.intervalMs = 1000;
    this.freeMemoryMb = null;
    this.error = '';
    this._timer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this);            // ✅ react to language changes
    this._fetch();
    this._timer = setInterval(() => this._fetch(), this.intervalMs);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    store.unsubscribe(this);
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  async _fetch() {
    try {
      const res = await fetch(this.endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        this.error = `${store.t("memoryInfo.endpointError")} (${res.status})`;
        this.freeMemoryMb = null;
        return;
      }

      const data = await res.json();
      const mb = Number(data.free_mb);

      if (Number.isFinite(mb)) {
        this.freeMemoryMb = mb;
        this.error = '';
      } else {
        this.error = store.t("memoryInfo.invalidPayload");
        this.freeMemoryMb = null;
      }
    } catch {
      this.error = store.t("memoryInfo.fetchFailed");
      this.freeMemoryMb = null;
    }
  }

  render() {
    const title = store.t("memoryInfo.title");

    if (this.error) {
      return html`
        <div class="meminfo">
          ${title}: <span class="error">${this.error}</span>
        </div>
      `;
    }

    if (this.freeMemoryMb === null) {
      return html`
        <div class="meminfo">
          ${title}: <em>${store.t("memoryInfo.loading")}</em>
        </div>
      `;
    }

    return html`
      <div class="meminfo">
        ${title}: <strong>${this.freeMemoryMb}</strong> MB
      </div>
    `;
  }
}

customElements.define('md-memory-info', MemoryInfo);
