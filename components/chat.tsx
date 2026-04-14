'use client'

import { useChat } from 'ai/react'
import { useRef, useEffect } from 'react'

// Build the API path using NEXT_PUBLIC_BASE_PATH (baked in at build time).
// This is explicit to avoid any ambiguity with Next.js basePath injection.
// Local dev: '' + '/api/chat' = '/api/chat'
// Production: '/chat-app' + '/api/chat' = '/chat-app/api/chat'
const API_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/chat`

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({ api: API_PATH })

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>AI Chat</h1>
      </header>

      <div className="messages-area" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Start a conversation with the AI assistant.</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`message message--${m.role}`}>
            <div className="message__bubble">
              <span className="message__role">
                {m.role === 'user' ? 'You' : 'AI'}
              </span>
              <p className="message__content">{m.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message--assistant">
            <div className="message__bubble">
              <span className="message__role">AI</span>
              <p className="message__content">
                <span className="typing-indicator" aria-label="AI is typing">
                  <span />
                  <span />
                  <span />
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
