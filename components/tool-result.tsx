'use client'

import type { ToolInvocation } from 'ai'

interface GitHubItem {
  number: number
  title: string
  state: string
  url: string
  author?: string
  assignee?: string | null
  labels?: string[]
  draft?: boolean
  created_at?: string
}

function StateTag({ state }: { state: string }) {
  const cls =
    state === 'open'   ? 'state-tag state-tag--open'   :
    state === 'merged' ? 'state-tag state-tag--merged'  :
                         'state-tag state-tag--closed'
  return <span className={cls}>{state}</span>
}

function ItemCard({ item }: { item: GitHubItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="gh-item"
    >
      <span className="gh-item__number">#{item.number}</span>
      <span className="gh-item__title">{item.title}</span>
      <div className="gh-item__meta">
        <StateTag state={item.state} />
        {item.draft && <span className="state-tag state-tag--draft">draft</span>}
        {item.labels?.map((l) => (
          <span key={l} className="label-tag">{l}</span>
        ))}
      </div>
    </a>
  )
}

function IssueDetail({ result }: { result: GitHubItem & { body?: string; comments?: number; updated_at?: string } }) {
  return (
    <div className="gh-detail">
      <div className="gh-detail__header">
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="gh-detail__title">
          #{result.number} {result.title}
        </a>
        <StateTag state={result.state} />
      </div>
      {result.labels && result.labels.length > 0 && (
        <div className="gh-detail__labels">
          {result.labels.map((l) => <span key={l} className="label-tag">{l}</span>)}
        </div>
      )}
      {result.body && (
        <p className="gh-detail__body">{result.body.slice(0, 400)}{result.body.length > 400 ? '…' : ''}</p>
      )}
      <div className="gh-detail__footer">
        {result.author && <span>by {result.author}</span>}
        {result.assignee && <span>· assigned to {result.assignee}</span>}
        {result.comments !== undefined && <span>· {result.comments} comments</span>}
      </div>
    </div>
  )
}

export function ToolResult({ inv }: { inv: ToolInvocation }) {
  if (inv.state !== 'result') {
    return (
      <div className="tool-pending">
        <span className="tool-pending__name">{inv.toolName.replace(/_/g, ' ')}</span>
        <span className="tool-pending__dots">…</span>
      </div>
    )
  }

  const result = inv.result as any

  if (inv.toolName === 'list_github_issues' || inv.toolName === 'list_github_prs') {
    const items: GitHubItem[] = Array.isArray(result) ? result : []
    const label = inv.toolName === 'list_github_issues' ? 'Issues' : 'Pull Requests'
    return (
      <div className="tool-result">
        <div className="tool-result__header">
          {label}
          <span className="tool-result__count">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="tool-result__empty">No {label.toLowerCase()} found.</p>
        ) : (
          <div className="tool-result__list">
            {items.map((item) => <ItemCard key={item.number} item={item} />)}
          </div>
        )}
      </div>
    )
  }

  if (inv.toolName === 'get_github_issue') {
    return (
      <div className="tool-result">
        <div className="tool-result__header">Issue Detail</div>
        <IssueDetail result={result} />
      </div>
    )
  }

  return null
}
