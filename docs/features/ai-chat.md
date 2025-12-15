# AI Chat

Complete guide to the AI-powered chat functionality in Nextbase Ultimate.

## Overview

Nextbase includes AI chat functionality powered by OpenAI, integrated into projects. Each project can have multiple chat conversations that persist across sessions.

## Architecture

### Chat Storage

Chats are stored in the `chats` table:
- **`id`**: Unique chat identifier (text)
- **`user_id`**: Owner of the chat
- **`project_id`**: Associated project
- **`payload`**: JSONB storing messages
- **`created_at`**: Creation timestamp

### Message Format

Messages follow the AI SDK format:
```typescript
type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};
```

## Creating Chats

### New Chat

When a user starts a new conversation, a chat is created:

```typescript
import { insertChatAction } from "@/data/user/chats";

const chat = await insertChatAction({
  id: nanoid(), // Generate unique ID
  projectId: "project-id",
  userId: "user-id"
});
```

### Chat Persistence

Chats are automatically saved after each message:

```typescript
import { upsertChatAction } from "@/data/user/chats";

await upsertChatAction({
  chatId: "chat-id",
  projectId: "project-id",
  payload: messages // Array of Message objects
});
```

## Chat Component

### ChatContainer

Main chat container component:

```tsx
import { ChatContainer } from "@/components/chat-container";

<ChatContainer
  id={chatId}
  initialMessages={messages}
  project={project}
/>
```

**Props**:
- `id`: Chat ID (optional for new chats)
- `initialMessages`: Initial message array
- `project`: Project object with `id`, `slug`, `name`

### ChatPanel

Input panel for sending messages:

```tsx
import { ChatPanel } from "@/components/chat-panel";

<ChatPanel
  id={chatId}
  isLoading={isLoading}
  append={append}
  reload={reload}
  stop={stop}
  input={input}
  setInput={setInput}
  messages={messages}
  projectSlug={project.slug}
/>
```

## Using AI Chat

### Basic Usage

```tsx
"use client";
import { useChat } from "ai/react";
import { ChatContainer } from "@/components/chat-container";

export function ProjectChat({ project, chatId, initialMessages }) {
  const { messages, append, isLoading } = useChat({
    id: chatId,
    initialMessages,
    body: { id: chatId },
    api: `/api/chat`, // Your chat API route
    onFinish: async (message) => {
      // Save chat after completion
      await saveChat({
        chatId,
        projectId: project.id,
        messages: [...messages, message]
      });
    }
  });

  return (
    <ChatContainer
      id={chatId}
      initialMessages={messages}
      project={project}
    />
  );
}
```

### Chat API Route

Create an API route for chat:

```typescript
// src/app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages, id } = await req.json();
  
  const result = streamText({
    model: openai("gpt-4"),
    messages,
  });

  return result.toDataStreamResponse();
}
```

## Chat History

### Loading Chat

```typescript
import { getChatById } from "@/data/user/chats";

const chat = await getChatById(chatId);
const messages = JSON.parse(chat.payload).messages;
```

### Listing Chats

```typescript
import { getChatsForProject } from "@/data/user/chats";

const chats = await getChatsForProject(projectId);
```

### Chat List Component

```tsx
import { ChatList } from "@/components/chat-list";

<ChatList
  chats={chats}
  projectSlug={project.slug}
  currentChatId={chatId}
/>
```

## Chat Features

### Message Streaming

Messages stream in real-time:

```typescript
const { messages, append } = useChat({
  streamProtocol: "data", // Enable streaming
  onUpdate: (messages) => {
    // Messages update as they stream
  }
});
```

### Regenerating Responses

```typescript
const { reload } = useChat();

// Regenerate last response
reload();
```

### Stopping Generation

```typescript
const { stop } = useChat();

// Stop current generation
stop();
```

## Chat Permissions

### Access Control

- Users can only access their own chats
- RLS policies enforce chat ownership
- Chats are scoped to projects

### Checking Access

```typescript
import { getChatById } from "@/data/user/chats";

const chat = await getChatById(chatId);
if (chat.user_id !== userId) {
  throw new Error("Unauthorized");
}
```

## Chat UI Components

### Chat Message

```tsx
import { ChatMessage } from "@/components/chat-message";

<ChatMessage
  message={message}
  isLast={isLast}
/>
```

### Chat History

```tsx
import { ChatHistory } from "@/components/chat-history";

<ChatHistory
  chats={chats}
  onSelectChat={(chatId) => {
    router.push(`/project/${projectSlug}/chats/${chatId}`);
  }}
/>
```

### Empty Screen

```tsx
import { EmptyScreen } from "@/components/empty-screen";

<EmptyScreen
  project={project}
  onNewChat={() => {
    // Start new chat
  }}
/>
```

## Chat Routing

### URL Structure

Chats are accessed via:
```
/project/[projectSlug]/chats/[chatId]
```

### Page Implementation

```tsx
// src/app/[locale]/.../project/[projectSlug]/chats/[chatId]/page.tsx
export default async function ChatPage({ params }) {
  const { projectSlug, chatId } = await params;
  
  const project = await getCachedProjectBySlug(projectSlug);
  const chat = await getChatById(chatId);
  const messages = JSON.parse(chat.payload).messages;
  
  return (
    <ProjectChat
      project={project}
      chatId={chatId}
      initialMessages={messages}
    />
  );
}
```

## OpenAI Configuration

### Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
```

### Model Selection

```typescript
import { openai } from "@ai-sdk/openai";

// Use GPT-4
const model = openai("gpt-4");

// Use GPT-3.5 Turbo
const model = openai("gpt-3.5-turbo");

// Use GPT-4 Turbo
const model = openai("gpt-4-turbo");
```

### Customizing Prompts

```typescript
const result = streamText({
  model: openai("gpt-4"),
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant for project management."
    },
    ...userMessages
  ],
});
```

## Chat Persistence

### Auto-Save

Chats are saved automatically after each message:

```typescript
const { messages, append } = useChat({
  onFinish: async (message) => {
    await upsertChatAction({
      chatId,
      projectId: project.id,
      payload: [...messages, message]
    });
  }
});
```

### Manual Save

```typescript
import { upsertChatAction } from "@/data/user/chats";

await upsertChatAction({
  chatId: "chat-id",
  projectId: "project-id",
  payload: messages
});
```

## Best Practices

### 1. Generate Unique Chat IDs

```typescript
import { nanoid } from "nanoid";

const chatId = nanoid();
```

### 2. Handle Errors

```typescript
const { append, error } = useChat({
  onError: (error) => {
    console.error("Chat error:", error);
    toast.error("Failed to send message");
  }
});
```

### 3. Optimize Payload Size

Store only necessary message data:
```typescript
const payload = messages.map(({ id, role, content }) => ({
  id,
  role,
  content
}));
```

### 4. Implement Rate Limiting

Consider rate limiting for:
- Message sending frequency
- Chat creation
- API calls

## Customization

### Custom Chat UI

Create custom chat components:

```tsx
export function CustomChatMessage({ message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="content">{message.content}</div>
      <div className="timestamp">{message.createdAt}</div>
    </div>
  );
}
```

### Custom Prompts

Add project-specific context:

```typescript
const systemPrompt = `You are assisting with project: ${project.name}.
Project description: ${project.description}.
Provide helpful guidance related to this project.`;
```

## Troubleshooting

### Chat Not Saving

**Check**:
1. User authentication
2. Project access
3. Database connection
4. RLS policies

### Messages Not Streaming

**Check**:
1. API route configuration
2. Streaming protocol
3. Network connection
4. OpenAI API key

### Chat Not Loading

**Check**:
1. Chat ID validity
2. User permissions
3. Database query
4. Payload format

## API Reference

### Server Actions

- `insertChatAction`
- `upsertChatAction`
- `getChatById`
- `getChatsForProject`

### Components

- `ChatContainer`
- `ChatPanel`
- `ChatList`
- `ChatMessage`
- `ChatHistory`
- `EmptyScreen`

## Further Reading

- [Projects](./projects.md) - Project context
- [Development Guide](../development.md) - Development workflow
- [OpenAI SDK Documentation](https://sdk.vercel.ai/docs)

---

**Next Steps**:
- [Projects](./projects.md) - Understand project context
- [Development Guide](../development.md) - Build chat features

