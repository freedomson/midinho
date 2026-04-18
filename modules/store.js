import { i18n, DEFAULT_LANG } from "./i18n.js";

class Store {

  constructor() {
    // ✅ INITIAL LANGUAGE
    this.lang = DEFAULT_LANG;
    this.loading = false;
    this.stopped = false;
    this.model = false;
    this.speak = false;
    this.speakerWorker = false;
    this._subscribers = new Set();
  }


  t(path, params = {}, fallback = "") {
    const pack = i18n[this.lang] ?? i18n[DEFAULT_LANG];
    let text = path.split('.').reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : null),
      pack
    );

    if (!text) return fallback;

    // ✅ simple interpolation
    return text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  }

  updateDirection(lang) {
    const rtl = new Set(["ar"]);
    document.documentElement.setAttribute(
      "dir",
      rtl.has(lang) ? "rtl" : "ltr"
    );
  }

  setLang(value) {
    this.lang = value || DEFAULT_LANG;
    this.updateDirection(this.lang);
    this._notify();
  }

  setStopped(value) {
    this.stopped = value;
    this._notify();
  }

  setLoading(value) {
    this.loading = value;
    this._notify();
  }

  setModel(value) {
    this.model = value;
    this._notify();
  }

  setSpeak(value) {
    this.speak = value;
    this._notify();
  }

  setSpeakerWorker(value) {
    this.speakerWorker = value;
    this._notify();
  }

  subscribe(component) {
    this._subscribers.add(component);
  }

  unsubscribe(component) {
    this._subscribers.delete(component);
  }

  _notify() {
    for (const comp of this._subscribers) {
      comp.requestUpdate?.();
    }
  }
}

export const store = new Store();