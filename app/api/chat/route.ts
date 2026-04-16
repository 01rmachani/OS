import { streamText, tool } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/provider'
import { listIssues, listPRs, getIssue } from '@/lib/github'

// Allow up to 60 seconds for multi-step tool use
export const maxDuration = 60

interface WorkspaceContext {
  workspaceName?: string
  githubRepo?: string   // "owner/repo"
  projectDescription?: string
}

function buildSystemPrompt(ctx: WorkspaceContext, user?: string | null): string {
  const lines: string[] = [
    'You are a helpful AI assistant for software development.',
  ]

  if (user) lines.push(`\nYou are assisting: ${user}`)

  if (ctx.workspaceName) lines.push(`\nWorkspace: ${ctx.workspaceName}`)
  if (ctx.githubRepo)    lines.push(`GitHub Repository: ${ctx.githubRepo}`)
  if (ctx.projectDescription) lines.push(`Project: ${ctx.projectDescription}`)

  if (ctx.githubRepo) {
    lines.push(
      '\nYou have tools to look up GitHub issues and pull requests for this repository.',
      'Use them when the user asks about issues, PRs, bugs, or tasks.',
    )
  }

  return lines.join('\n')
}

function parseRepo(repo: string): { owner: string; repoName: string } | null {
  const parts = repo.split('/')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return { owner: parts[0], repoName: parts[1] }
}

export async function POST(req: Request) {
  const { messages, context = {} } = (await req.json()) as {
    messages: unknown[]
    context: WorkspaceContext
  }

  const user = req.headers.get('x-auth-request-user')

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(context, user),
    messages: messages as Parameters<typeof streamText>[0]['messages'],
    maxSteps: 5,
    tools: {
      list_github_issues: tool({
        description: 'List GitHub issues for a repository.',
        parameters: z.object({
          owner: z.string().describe('Repository owner or org'),
          repo: z.string().describe('Repository name'),
          state: z.enum(['open', 'closed', 'all']).default('open'),
          limit: z.number().min(1).max(25).default(10),
        }),
        execute: async ({ owner, repo, state, limit }) =>
          listIssues(owner, repo, state, limit),
      }),

      list_github_prs: tool({
        description: 'List pull requests for a GitHub repository.',
        parameters: z.object({
          owner: z.string().describe('Repository owner or org'),
          repo: z.string().describe('Repository name'),
          state: z.enum(['open', 'closed', 'all']).default('open'),
          limit: z.number().min(1).max(25).default(10),
        }),
        execute: async ({ owner, repo, state, limit }) =>
          listPRs(owner, repo, state, limit),
      }),

      get_github_issue: tool({
        description: 'Get full details of a specific GitHub issue by number.',
        parameters: z.object({
          owner: z.string(),
          repo: z.string(),
          issue_number: z.number().int().positive(),
        }),
        execute: async ({ owner, repo, issue_number }) =>
          getIssue(owner, repo, issue_number),
      }),
    },
    // If the workspace has a repo set, seed the default owner/repo for tools
    // by injecting it into the system — actual defaults are up to the AI.
    onStepFinish: undefined,
  })

  return result.toDataStreamResponse()
}
