# AI Providers

chat-app supports multiple AI backends. The active provider is selected at **runtime** via the `AI_PROVIDER` environment variable, so the same Docker image works with any backend — no rebuild required.

## Configuration variables

| Variable | Description |
|---|---|
| `AI_PROVIDER` | Which backend to use (see options below). Default: `openai` |
| `AI_MODEL` | Model name, provider-specific. Default: `gpt-4o-mini` |
| `AI_API_KEY` | API key. Not required for Ollama |
| `AI_BASE_URL` | Base URL. Required for `ollama`, `openrouter`, and `custom` |

Set these in `.env.local` for local development or as Kubernetes ConfigMap/Secret values in production (see [`docs/deployment.md`](deployment.md)).

---

## OpenAI

The default provider.

```ini
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

**Common models:** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o1-mini`, `o3-mini`

Get an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

---

## Anthropic

```ini
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...
AI_MODEL=claude-haiku-4-5-20251001
```

**Common models:** `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`

Get an API key at [console.anthropic.com](https://console.anthropic.com).

---

## Ollama (local / self-hosted)

Ollama exposes an OpenAI-compatible API. No API key is needed.

```ini
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
```

**In Kubernetes**, if Ollama runs as a service in the same cluster:

```ini
AI_BASE_URL=http://ollama.default.svc.cluster.local:11434/v1
```

Pull a model before use:

```bash
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5-coder
```

List available models: `ollama list`

---

## OpenRouter

OpenRouter provides access to dozens of models (GPT-4, Claude, Llama, Mistral, etc.) through a single API.

```ini
AI_PROVIDER=openrouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...
AI_MODEL=openai/gpt-4o-mini
```

**Model format:** `<provider>/<model>` — e.g. `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.1-8b-instruct:free`

Browse models and pricing at [openrouter.ai/models](https://openrouter.ai/models).

Get an API key at [openrouter.ai/keys](https://openrouter.ai/keys).

---

## Custom (any OpenAI-compatible endpoint)

Any API that implements the OpenAI chat completions interface works with the `custom` provider type.

```ini
AI_PROVIDER=custom
AI_BASE_URL=https://my-llm-proxy.example.com/v1
AI_API_KEY=my-key          # omit if not required
AI_MODEL=my-model-name
```

Compatible backends include: vLLM, LM Studio, LocalAI, Azure OpenAI, Together AI, Groq, Fireworks AI, and others.

**Azure OpenAI** example:

```ini
AI_PROVIDER=custom
AI_BASE_URL=https://<resource>.openai.azure.com/openai/deployments/<deployment>
AI_API_KEY=<azure-api-key>
AI_MODEL=gpt-4o
```

---

## Switching providers at runtime

Because all config is read at request time (not build time), you can switch providers by updating your `.env.local` and restarting the dev server — or by updating the Kubernetes ConfigMap and restarting the pods.

```bash
# Kubernetes — switch to Ollama without rebuilding the image
kubectl patch configmap chat-app-config \
  --type merge \
  -p '{"data":{"AI_PROVIDER":"ollama","AI_BASE_URL":"http://ollama:11434/v1","AI_MODEL":"llama3.2"}}'

kubectl rollout restart deployment/chat-app
```

---

## Adding a new provider

The provider factory lives in [`lib/provider.ts`](../lib/provider.ts). To add support for a new SDK-native provider:

1. Install the provider package: `npm install @ai-sdk/<provider>`
2. Import `create<Provider>` from the package
3. Add a `case` to the `switch` statement in `getModel()`
4. Document the new env var values here

For any OpenAI-compatible endpoint, the existing `custom` case already handles it — no code change needed.
