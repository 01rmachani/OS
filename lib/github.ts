const GITHUB_API = 'https://api.github.com'

function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'chat-app',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function ghFetch(path: string) {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: getHeaders() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`GitHub ${res.status}: ${(err as { message?: string }).message ?? res.statusText}`)
  }
  return res.json()
}

export async function listIssues(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all',
  limit: number,
) {
  const data = await ghFetch(
    `/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}`,
  )
  return (data as any[])
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number as number,
      title: i.title as string,
      state: i.state as string,
      url: i.html_url as string,
      author: (i.user?.login ?? '') as string,
      assignee: (i.assignee?.login ?? null) as string | null,
      labels: (i.labels as any[]).map((l) => l.name as string),
      comments: i.comments as number,
      created_at: i.created_at as string,
    }))
}

export async function listPRs(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all',
  limit: number,
) {
  const data = await ghFetch(
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${limit}`,
  )
  return (data as any[]).map((pr) => ({
    number: pr.number as number,
    title: pr.title as string,
    state: (pr.merged_at ? 'merged' : pr.state) as string,
    url: pr.html_url as string,
    author: (pr.user?.login ?? '') as string,
    head: (pr.head?.label ?? '') as string,
    base: (pr.base?.label ?? '') as string,
    draft: pr.draft as boolean,
    created_at: pr.created_at as string,
  }))
}

export async function getIssue(owner: string, repo: string, number: number) {
  const i = await ghFetch(`/repos/${owner}/${repo}/issues/${number}`)
  return {
    number: i.number as number,
    title: i.title as string,
    state: i.state as string,
    url: i.html_url as string,
    author: (i.user?.login ?? '') as string,
    assignee: (i.assignee?.login ?? null) as string | null,
    labels: (i.labels as any[]).map((l) => l.name as string),
    comments: i.comments as number,
    created_at: i.created_at as string,
    updated_at: i.updated_at as string,
    // Truncate body to avoid flooding the context window
    body: i.body ? (i.body as string).slice(0, 1000) : '',
  }
}
