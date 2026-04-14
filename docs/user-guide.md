# User Guide

## Accessing the app

| Environment | URL |
|---|---|
| Local development | `http://localhost:3000` |
| Kubernetes (Traefik) | `https://your-domain.com/chat-app` |

---

## Sending a message

1. Type your message in the input field at the bottom of the screen.
2. Press **Enter** or click **Send**.
3. The AI response streams in word-by-word as it is generated.

The input field is disabled while the AI is responding. You can start a new message as soon as the response finishes.

---

## Conversation context

The full conversation history is sent to the AI on every message, so the model can see everything said earlier in the session. You can reference previous messages naturally:

> **You:** What is the capital of France?
> **AI:** The capital of France is Paris.
> **You:** What is its population?
> **AI:** Paris has a population of approximately 2.1 million in the city proper...

---

## Starting a new conversation

Refresh the page to clear the chat history and start a fresh conversation. The current session is held in browser memory only — nothing is persisted between page loads.

---

## Error messages

If the AI fails to respond, a red error banner appears below the last message. Common causes:

| Error | Likely cause |
|---|---|
| `API key missing` or `401 Unauthorized` | `AI_API_KEY` is not set or is invalid |
| `Model not found` | `AI_MODEL` is not available for the configured provider |
| `Connection refused` | `AI_BASE_URL` is unreachable (check Ollama is running, or base URL is correct) |
| `Rate limit exceeded` | You have hit the provider's request limit |

After fixing the underlying issue, refresh the page and try again.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Enter` | Send message |
| `Shift + Enter` | Insert a newline in the message (multi-line input) |

---

## Tips

- **Be specific** — the more context you provide, the better the response.
- **Multi-line messages** — use `Shift+Enter` to write longer prompts across multiple lines before sending.
- **Long responses** — the chat area scrolls automatically as new content streams in. You can scroll up to re-read earlier messages at any time.
- **Code and formatting** — responses are displayed as plain text. Markdown formatting (if returned by the model) is shown as-is in the current version.
