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
    try {
      const response = await fetch(this.getEndpointByOperation('tags'));
      if (!response.ok) throw new Error('ollama-connection-error-api');
      const data = await response.json();
      this.models = data.models
      this.modelNames = this.models.map(model => model.name);
      return this.modelNames;
    } catch (error) {
      console.error('Error fetching model list:', error);
      throw new Error('ollama-connection-error-api');
    }
  }
}

// Export a single instance of the class
const OllamaApiInstace = new OllamaApi();
export default OllamaApiInstace;
