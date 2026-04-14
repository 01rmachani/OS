# Getting Started

This guide covers running chat-app locally for development.

## Prerequisites

- **Node.js** 22+ ([nodejs.org](https://nodejs.org))
- An API key for your chosen AI provider, or a running Ollama instance

## 1. Clone and install

```bash
git clone https://github.com/01rmachani/OS.git
cd OS
npm install
```

## 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```ini
# Pick a provider (see docs/providers.md for all options)
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
```

For Ollama running locally:

```ini
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.2
# AI_API_KEY is not required for Ollama
```

## 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs at the root path `/` in development. There is no `BASE_PATH` set locally — that is only baked into production Docker builds.

## 4. Verify the API

The health endpoint confirms the server is running:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"..."}
```

Test the chat endpoint directly:

```bash
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

You should see a streaming response in the Vercel AI SDK data stream format.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build (outputs to `.next/`) |
| `npm start` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Building with a base path locally

To test the exact behaviour the K8s image will have:

```bash
BASE_PATH=/chat-app npm run build
npm start
# open http://localhost:3000/chat-app
```

## Troubleshooting

**`AI_API_KEY` not set / invalid** — The `/api/chat` route will return an error message in the chat UI. Check the terminal for the full error from the provider SDK.

**Ollama not reachable** — Make sure Ollama is running (`ollama serve`) and `AI_BASE_URL` points to the correct host and port. The default is `http://localhost:11434/v1`.

**Port already in use** — Next.js defaults to port 3000. Run on a different port with `PORT=3001 npm run dev`.

**TypeScript errors after pulling** — Run `npm install` to sync dependencies, then `npm run build` to re-check types.
