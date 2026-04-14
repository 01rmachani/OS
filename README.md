# chat-app

A minimal, production-ready AI chat application built with **Next.js 15** and the **Vercel AI SDK**. Designed to be deployed in Kubernetes behind a Traefik ingress controller at a configurable base path.

## Features

- Streaming responses via Vercel AI SDK (`streamText` + `useChat`)
- Multi-provider support — OpenAI, Anthropic, Ollama, OpenRouter, or any OpenAI-compatible endpoint
- Configurable base path for sub-path Kubernetes deployments (`/chat-app`)
- Multi-stage Docker build using Next.js standalone output (~150 MB image)
- Kubernetes manifests with Traefik ingress (IngressRoute CRD and standard Ingress options)
- Health endpoint for liveness/readiness probes (`/api/health`)

## Quick Start

```bash
cp .env.local.example .env.local   # fill in AI_PROVIDER + AI_API_KEY
npm install
npm run dev
# open http://localhost:3000
```

See [`docs/getting-started.md`](docs/getting-started.md) for full local setup instructions.

## Documentation

| Document | Description |
|---|---|
| [Getting Started](docs/getting-started.md) | Local development setup |
| [AI Providers](docs/providers.md) | Configure OpenAI, Anthropic, Ollama, OpenRouter, custom |
| [Deployment](docs/deployment.md) | Docker build and Kubernetes deployment with Traefik |
| [User Guide](docs/user-guide.md) | Using the chat interface |

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # POST — streaming AI endpoint
│   │   └── health/route.ts     # GET  — K8s probe target
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── chat.tsx                # Chat UI (useChat hook)
├── lib/
│   └── provider.ts             # AI provider factory
├── k8s/
│   ├── configmap.yaml
│   ├── deployment.yaml
│   ├── ingress.yaml
│   ├── secret.yaml
│   └── service.yaml
├── Dockerfile
├── next.config.ts
└── .env.local.example
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | No | `openai` | Provider: `openai` \| `anthropic` \| `ollama` \| `openrouter` \| `custom` |
| `AI_MODEL` | No | `gpt-4o-mini` | Model name for the selected provider |
| `AI_API_KEY` | Depends | — | API key (not needed for Ollama) |
| `AI_BASE_URL` | Depends | — | Base URL (required for `ollama`, `openrouter`, `custom`) |
| `BASE_PATH` | Build-time | `""` | Sub-path prefix baked into the bundle (e.g. `/chat-app`) |

## Docker

```bash
# Build for Kubernetes (base path baked in at build time)
docker build --build-arg BASE_PATH=/chat-app -t chat-app:latest .

# Run locally
docker run -p 3000:3000 \
  -e AI_PROVIDER=openai \
  -e AI_API_KEY=sk-... \
  chat-app:latest
# open http://localhost:3000/chat-app
```

## Kubernetes

```bash
# 1. Create the API key secret
kubectl create secret generic chat-app-secrets \
  --from-literal=ai-api-key=YOUR_KEY

# 2. Update k8s/configmap.yaml with your provider settings
# 3. Update k8s/deployment.yaml with your image registry

# 4. Apply all manifests
kubectl apply -f k8s/
```

Traefik routes `PathPrefix(/chat-app)` → service port 80. No strip-prefix middleware needed — the app handles its own base path.

See [`docs/deployment.md`](docs/deployment.md) for the full guide.
