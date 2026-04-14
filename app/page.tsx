import { Chat } from '@/components/chat'

export default function Home() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Chat />
    </main>
  )
}
