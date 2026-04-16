'use client'

import { useChat } from 'ai/react'
import { useRef, useEffect } from 'react'
import { ToolResult } from './tool-result'
import type { WorkspaceContext } from './sidebar'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const API_PATH = `${BASE}/api/chat`

interface ChatProps {
  context: WorkspaceContext
}

export function Chat({ context }: ChatProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: API_PATH,
      // context is merged into every request body so the server can build
      // the system prompt with workspace / GitHub repo details.
      body: { context },
    })

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasRepo = context.githubRepo.trim() !== ''

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>{context.workspaceName || 'AI Chat'}</h1>
        {hasRepo && (
          <a
            className="chat-header__repo"
            href={`https://github.com/${context.githubRepo}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {context.githubRepo}
          </a>
        )}
      </header>

      <div className="messages-area" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Start a conversation with the AI assistant.</p>
            {hasRepo && (
              <p className="empty-state__hint">
                Try: "Show me open issues" or "List recent pull requests"
              </p>
            )}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`message message--${m.role}`}>
            <div className="message__bubble">
              <span className="message__role">
                {m.role === 'user' ? 'You' : 'AI'}
              </span>
              {m.content && (
                <p className="message__content">{m.content}</p>
              )}
              {m.toolInvocations?.map((inv) => (
                <ToolResult key={inv.toolCallId} inv={inv} />
              ))}
            </div>
          </div>
        ))}

        {isLoading && !messages[messages.length - 1]?.toolInvocations && (
          <div className="message message--assistant">
            <div className="message__bubble">
              <span className="message__role">AI</span>
              <p className="message__content">
                <span className="typing-indicator" aria-label="AI is typing">
                  <span /><span /><span />
                </span>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            Error: {error.message}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="input-area" onSubmit={handleSubmit}>
        <input
          className="input-field"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message…"
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <button
          type="submit"
          className="send-button"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  )
}
