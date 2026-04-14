// Health check endpoint used by Kubernetes liveness and readiness probes.
// Must be reachable at <basePath>/api/health (e.g. /chat-app/api/health).
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
