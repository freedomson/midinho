export class WorkerPool {
  constructor(workerUrl, size = navigator.hardwareConcurrency || 3) {
    this.workerUrl = workerUrl;
    this.size = size;

    this.workers = [];
    this.idleWorkers = [];
    this.jobs = new Map();
    this.queue = [];

    this.listeners = new Set();

    this.readyCount = 0;
    this.totalWorkers = size;

    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerUrl);

      worker.addEventListener("message", (e) => {
        this._handleMessage(worker, e);
      });

      worker.addEventListener("error", (err) => {
        console.error("[WorkerPool] Worker error:", err);
      });

      this.workers.push(worker);
      this.idleWorkers.push(worker);
    }
  }

  /* ------------------------- */

  run(data) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();

      const job = { id, data, resolve, reject };

      this.jobs.set(id, job);
      this.queue.push(job);

      this._dispatch();
    });
  }

  post(data) {
    // broadcast (init etc.)
    this.workers.forEach((w) => w.postMessage(data));
  }

  addListener(fn) {
    this.listeners.add(fn);
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
    this.jobs.clear();
    this.queue = [];
    this.idleWorkers = [];
  }

  reset() {
    // 1. Reject all pending jobs
    for (const job of this.jobs.values()) {
      job.reject(new Error("WorkerPool reset"));
    }

    // 2. Clear internal queues
    this.jobs.clear();
    this.queue = [];

    // 3. Rebuild idle list (workers stay alive!)
    this.idleWorkers = [...this.workers];

  }

  /* ------------------------- */

  _dispatch() {
    while (this.idleWorkers.length && this.queue.length) {
      const worker = this.idleWorkers.pop();
      const job = this.queue.shift();

      worker._currentJobId = job.id;

      worker.postMessage({
        id: job.id,
        ...job.data
      });
    }
  }

  _handleMessage(worker, e) {
    const data = e.data;

    // Worker initialization status
    if (data.workerReady) {
      this.readyCount++;

      if (this.readyCount === this.totalWorkers) {
        // broadcast to listeners
        this.listeners.forEach(fn => fn({ status: "all-workers-ready" }));
      }

      return;
    }

    // resolve job
    if (data?.id && this.jobs.has(data.id)) {
      const job = this.jobs.get(data.id);

      job.resolve(data);
      this.jobs.delete(data.id);

      // mark worker idle again
      this.idleWorkers.push(worker);

      // process next queued job
      this._dispatch();
      return;
    }

    // broadcast (status, ready, etc.)
    this.listeners.forEach(fn => fn(data));
  }
}