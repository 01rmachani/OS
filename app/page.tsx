'use client'

import { useState } from 'react'
import { Chat } from '@/components/chat'
import { Sidebar } from '@/components/sidebar'
import type { WorkspaceContext } from '@/components/sidebar'

const DEFAULT_CONTEXT: WorkspaceContext = {
  workspaceName: '',
  githubRepo: '',
  projectDescription: '',
}

export default function Home() {
  const [context, setContext] = useState<WorkspaceContext>(DEFAULT_CONTEXT)

  return (
    <div className="app-layout">
      <Sidebar context={context} onChange={setContext} />
      <main className="app-main">
        <Chat context={context} />
      </main>
    </div>
  )
}
