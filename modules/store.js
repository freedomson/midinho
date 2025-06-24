class Store {
  constructor() {
    this.loading = false;
    this.model = false;
    this.speak = false;
    this.speakerWorker = false
    this._subscribers = new Set();
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