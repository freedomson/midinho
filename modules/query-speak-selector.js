import { LitElement, html, css } from './node_modules/lit-element/lit-element.js';
import { picocss } from './style.js';
import { store } from './store.js';
import { i18n, DEFAULT_LANG } from './i18n.js';
import { WorkerPool } from "./workerPool.js"

export class Header extends LitElement {
  static styles = [picocss, css`

    .speak-toggle {
      display: inline-flex;
      align-items: center;
    }

    .speak-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 1rem;
    }
  `];

  connectedCallback() {
    super.connectedCallback();
    store.subscribe(this);
  }

  disconnectedCallback() {
    store.unsubscribe(this);
    super.disconnectedCallback();
  }

  /* ---------- Language handling ---------- */

  onLanguageChange(e) {
    const lang = e.target.value;
    store.setLang(lang);

    this.setupSpeakerWorker();
  }

  /* ---------- Speak toggle ---------- */

  onSpeakToggle(e) {
    store.setSpeak(e.target.checked);
    this.setupSpeakerWorker();
  }


setupSpeakerWorker() {
  const enabled = store.speak;
  const lang = store.lang;

  if (!enabled || !lang) {
    store.setSpeakerWorker(false);
    store.setLoading(false);
    return;
  }

  if (store.speakerWorker) {
    store.speakerWorker.terminate();
  }

  const pool = new WorkerPool('/modules/tts/audioWorker.js');

  pool.post({ init: true, lang });

  // TODO
  // "Downloading data... (198180864/199943572)"
  // "Running...""
  store.setLoading(true);
  pool.addListener(evt => {

    if (evt.status === "all-workers-ready") {
      store.setLoading(false);
      console.log("--- all workers ready ---")
    }

    // if (evt.status !== undefined) {
    //   store.setLoading(evt.status);
    // }
  });

  store.setSpeakerWorker(pool);
  store.setLoading(true);
}

  /* ---------- Helpers ---------- */

  getLanguages() {
    return Object.keys(i18n);
  }

  getLanguageLabel(lang) {
    // fallback-safe label system
    return i18n?.[lang]?.header?.language || lang;
  }

  /* ---------- Render ---------- */

  render() {
    const langs = this.getLanguages();

    return html`
      <!-- Language selector -->
      <select
        id="md-speak-selector"
        class="md-speak-selector"
        .value=${store.lang || DEFAULT_LANG}
        @change=${(e) => this.onLanguageChange(e)}>

        ${langs.map(lang => html`
          <option value="${lang}">
            ${this.getLanguageLabel(lang)}
          </option>
        `)}
      </select>

      <!-- Speak toggle -->
      <label class="speak-toggle">
        <input
          type="checkbox"
          role="switch"
          .checked=${store.speak}
          ?disabled=${!store.lang}
          @change=${(e) => this.onSpeakToggle(e)}
        />
        <span class="speak-label">
          ${store.t("header.speak")}
        </span>
      </label>
    `;
  }
}

customElements.define('md-speak-selector', Header);