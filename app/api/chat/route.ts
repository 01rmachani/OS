import { streamText } from 'ai'
import { getModel } from '@/lib/provider'

// Allow up to 30 seconds for streaming responses
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: getModel(),
    system: 'You are a helpful AI assistant.',
    messages,
  })

  return result.toDataStreamResponse()
}
