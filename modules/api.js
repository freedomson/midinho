class OllamaApi {
  constructor() {
    if (OllamaApi.instance) {
      return OllamaApi.instance;
    }
    this.endpoint = "http://localhost:11434/api/";
    this.models = []
    this.modelNames = []
    OllamaApi.instance = this;
  }

  getEndpointByOperation(operation) {
    if (operation) {
      return `${this.endpoint}${operation}`
    } else {
      return `${this.endpoint}`
    }
  }

  async getOllamaModels() {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const maxRetries = 5;          // total attempts
    const delayMs = 1000;          // 1 seconds between failed attempts
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(this.getEndpointByOperation('tags'));

        if (!response.ok) {
          throw new Error('ollama-connection-error-api');
        }

        const data = await response.json();
        this.models = data.models || [];
        this.modelNames = this.models.map((model) => model.name);
        return this.modelNames;

      } catch (error) {
        lastError = error;
        console.error(`Error fetching model list (attempt ${attempt}/${maxRetries}):`, error);

        // wait 5s before next attempt (but not after the last)
        if (attempt < maxRetries) {
          await sleep(delayMs);
          continue;
        }

        // after final attempt, throw your canonical error
        throw new Error('ollama-connection-error-api');
      }
    }

    // Should never hit, but keeps control flow explicit
    throw (lastError instanceof Error ? lastError : new Error('ollama-connection-error-api'));
  }

  async loadModelFromSystem(modelName) {
    const response = await fetch("http://localhost:8081/load-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || "python-load-model-error");
    }

    return await response.json();
  }

  async stopModelFromSystem(modelName) {
    console.log(modelName)
    const response = await fetch("http://localhost:8081/stop-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || "python-stop-model-error");
    }

    return await response.json();
  }

  async getLoadedModels() {
    const response = await fetch(this.getEndpointByOperation("ps"), {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error("ollama-connection-error-api");
    }

    const data = await response.json();
    return (data.models || []).map(m => m.name);
  }

  async isModelLoaded(modelName) {
    const loaded = await this.getLoadedModels();
    return loaded.includes(modelName);
  }


}

// Export a single instance of the class
const OllamaApiInstace = new OllamaApi();
export default OllamaApiInstace;
