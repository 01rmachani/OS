import { headers } from 'next/headers'

// Returns the authenticated user identity injected by the DKubeX reverse proxy.
// Returns 401 when running outside the platform (no auth headers present).
export async function GET() {
  const h = await headers()
  const user      = h.get('x-auth-request-user')
  const email     = h.get('x-auth-request-email')
  const role      = h.get('x-auth-request-role')
  const namespace = h.get('x-auth-request-user-namespace')

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return Response.json({ user, email, role, namespace })
}
