import type { Post, ChatMessage, Identity } from "../../shared/types"
import { FeedTab } from "./FeedTab"
import { ChatTab } from "./ChatTab"

interface WorkspaceTabsProps {
  activeTab: "feed" | "chat" | "connection"
  posts: Post[]
  messages: ChatMessage[]
  identity: Identity
  tailnetUrl: string
  onSendMessage: (text: string) => void
  onUploadFile: (file: File) => void
}

export function WorkspaceTabs({
  activeTab,
  posts,
  messages,
  identity,
  tailnetUrl,
  onSendMessage,
  onUploadFile,
}: WorkspaceTabsProps) {
  if (activeTab === "feed") {
    return <FeedTab posts={posts} tailnetUrl={tailnetUrl} onUploadFile={onUploadFile} />
  }

  if (activeTab === "chat") {
    return <ChatTab messages={messages} identity={identity} onSendMessage={onSendMessage} />
  }

  return null
}
