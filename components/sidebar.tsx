'use client'

import { useEffect, useState } from 'react'

export interface WorkspaceContext {
  workspaceName: string
  githubRepo: string      // "owner/repo"
  projectDescription: string
}

interface UserInfo {
  user: string
  email?: string
  role?: string
  namespace?: string
}

interface SidebarProps {
  context: WorkspaceContext
  onChange: (ctx: WorkspaceContext) => void
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function Sidebar({ context, onChange }: SidebarProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetch(`${BASE}/api/whoami`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUserInfo(data))
      .catch(() => null)
  }, [])

  function set(field: keyof WorkspaceContext) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...context, [field]: e.target.value })
  }

  if (collapsed) {
    return (
      <aside className="sidebar sidebar--collapsed">
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand"
        >
          ›
        </button>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">AI Dev Chat</span>
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          title="Collapse"
        >
          ‹
        </button>
      </div>

      <div className="sidebar__section">
        <p className="sidebar__section-label">Workspace</p>

        <label className="sidebar__label">
          Name
          <input
            className="sidebar__input"
            type="text"
            placeholder="My Project"
            value={context.workspaceName}
            onChange={set('workspaceName')}
          />
        </label>

        <label className="sidebar__label">
          GitHub Repo
          <input
            className="sidebar__input"
            type="text"
            placeholder="owner/repo"
            value={context.githubRepo}
            onChange={set('githubRepo')}
            spellCheck={false}
          />
        </label>

        <label className="sidebar__label">
          Description
          <textarea
            className="sidebar__textarea"
            placeholder="Brief project description for the AI…"
            value={context.projectDescription}
            onChange={set('projectDescription')}
            rows={3}
          />
        </label>
      </div>

      {userInfo && (
        <div className="sidebar__footer">
          <span className="sidebar__avatar">{userInfo.user[0].toUpperCase()}</span>
          <div className="sidebar__user">
            <span className="sidebar__username">{userInfo.user}</span>
            {userInfo.role && <span className="sidebar__role">{userInfo.role}</span>}
          </div>
        </div>
      )}
    </aside>
  )
}
