import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

/**
 * Returns a language model instance based on environment variables.
 *
 * AI_PROVIDER  — which backend to use (default: "openai")
 *   openai       → OpenAI API (needs AI_API_KEY)
 *   anthropic    → Anthropic Claude API (needs AI_API_KEY)
 *   ollama       → Ollama local server (set AI_BASE_URL=http://ollama:11434/v1)
 *   openrouter   → OpenRouter (set AI_BASE_URL + AI_API_KEY)
 *   custom       → Any OpenAI-compatible endpoint (set AI_BASE_URL + optional AI_API_KEY)
 *
 * AI_MODEL     — model name for the selected provider (default: "gpt-4o-mini")
 * AI_API_KEY   — API key; optional for Ollama
 * AI_BASE_URL  — base URL; required for ollama / openrouter / custom
 */
export function getModel() {
  const provider = process.env.AI_PROVIDER ?? 'openai'
  const model    = process.env.AI_MODEL    ?? 'gpt-4o-mini'
  const apiKey   = process.env.AI_API_KEY  ?? ''
  const baseURL  = process.env.AI_BASE_URL

  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(model)

    case 'ollama':
    case 'openrouter':
    case 'custom': {
      if (!baseURL) {
        throw new Error(
          `AI_BASE_URL must be set when using AI_PROVIDER="${provider}". ` +
          'Examples: http://localhost:11434/v1 (Ollama), https://openrouter.ai/api/v1 (OpenRouter)'
        )
      }
      return createOpenAI({ apiKey, baseURL })(model)
    }

    default: // 'openai'
      return createOpenAI({ apiKey })(model)
  }
}
