# Midinho
Midinho is a WebAssembly/Emscripten Chat for [Ollma](https://ollama.com).

Built using [Pyodide](https://pyodide.org)

## Install Ollama
[Download and install Ollma](https://ollama.com/download)
```
# Run llama3
ollama run llama3
# Test status
curl http://localhost:11434
Ollama is running%
```

## Serve Chat
Serve static files via Python
```
cd static
python -m http.server 8000
```
Open LLM Chat http://localhost:8000/


https://lit.dev/