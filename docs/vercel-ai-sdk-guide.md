# Vercel AI SDK Comprehensive Guide

## Overview

The Vercel AI SDK (npm package: `ai`) is a TypeScript toolkit for building AI-powered applications with streaming, tool calling, and structured outputs. It supports multiple LLM providers and provides both backend (AI SDK Core) and frontend (AI SDK UI) utilities.

**Latest Version**: 3.x (as of January 2025)

## Installation

```bash
npm install ai
# Install provider SDKs
npm install @ai-sdk/anthropic  # For Claude
npm install @ai-sdk/openai     # For OpenAI
```

---

## 1. Core APIs

### AI SDK Core vs AI SDK UI

- **AI SDK Core**: Server-side functions (`generateText`, `streamText`, `generateObject`, `streamObject`)
- **AI SDK UI**: React hooks (`useChat`, `useCompletion`, `useObject`)

### `generateText` - Synchronous Text Generation

Generate text and wait for the complete response.

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text, finishReason, usage } = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'Explain quantum computing in simple terms',
  maxTokens: 1024,
  temperature: 0.7,
});

console.log(text);
console.log(usage); // { promptTokens, completionTokens, totalTokens }
```

**Key Features:**
- Returns complete response after generation
- Access to usage metadata
- Simpler for non-streaming use cases

### `streamText` - Streaming Text Generation

Stream text responses token-by-token.

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'Write a story about a robot',
  maxTokens: 2048,
});

// Consume stream
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Or convert to streaming response for API routes
return result.toTextStreamResponse();
```

**Key Features:**
- Low latency - show results as they arrive
- Built-in conversion to Response objects
- Automatic handling of provider-specific streaming formats

### `generateObject` - Structured Output Generation

Generate typed, structured data using Zod schemas.

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const { object } = await generateObject({
  model: anthropic('claude-3-5-sonnet-20241022'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.object({
        name: z.string(),
        amount: z.string(),
      })),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a recipe for chocolate chip cookies',
});

// object is fully typed based on the Zod schema
console.log(object.recipe.name);
console.log(object.recipe.ingredients);
```

**Key Features:**
- Type-safe responses with TypeScript inference
- Automatic JSON schema conversion from Zod
- Built-in validation and error handling
- Works with providers that support structured outputs

### `streamObject` - Streaming Structured Outputs

Stream structured data as it's being generated.

```typescript
import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const { partialObjectStream } = await streamObject({
  model: anthropic('claude-3-5-sonnet-20241022'),
  schema: z.object({
    characters: z.array(z.object({
      name: z.string(),
      role: z.string(),
      backstory: z.string(),
    })),
  }),
  prompt: 'Create 3 fantasy characters',
});

// Stream partial objects as they're built
for await (const partialObject of partialObjectStream) {
  console.log(partialObject);
  // Early objects may have incomplete data
  // Final object is complete and validated
}
```

**Key Features:**
- Progressive rendering of structured data
- Partial objects with optional fields
- Automatic validation on completion

---

## 2. Tool Calling

### Defining Tools with Zod

Tools allow the AI to call functions and use the results in its response.

```typescript
import { generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'What is the weather in San Francisco?',
  tools: {
    getWeather: tool({
      description: 'Get the current weather for a location',
      parameters: z.object({
        location: z.string().describe('The city and state, e.g. San Francisco, CA'),
        unit: z.enum(['celsius', 'fahrenheit']).optional(),
      }),
      execute: async ({ location, unit = 'fahrenheit' }) => {
        // Call your weather API
        const weather = await fetchWeather(location, unit);
        return {
          temperature: weather.temp,
          conditions: weather.conditions,
        };
      },
    }),
  },
});

console.log(result.text);
console.log(result.toolCalls); // Array of tool invocations
console.log(result.toolResults); // Array of tool results
```

### Multi-Step Tool Calling

The AI SDK supports automatic multi-step tool execution where the model can call tools, receive results, and make additional tool calls.

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'Find the weather in the user\'s location and suggest activities',
  tools: {
    getUserLocation: tool({
      description: 'Get the user\'s current location',
      parameters: z.object({}),
      execute: async () => ({ city: 'San Francisco', state: 'CA' }),
    }),
    getWeather: tool({
      description: 'Get weather for a location',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => ({
        temp: 72,
        conditions: 'sunny',
      }),
    }),
    suggestActivities: tool({
      description: 'Suggest activities based on weather',
      parameters: z.object({
        weather: z.string(),
        temperature: z.number(),
      }),
      execute: async ({ weather, temperature }) => ({
        activities: ['hiking', 'beach', 'outdoor dining'],
      }),
    }),
  },
  maxToolRoundtrips: 5, // Allow multiple rounds of tool calls
});
```

**Key Features:**
- Automatic tool execution and result passing
- Control over max roundtrips to prevent infinite loops
- Access to full conversation history with tool calls
- Parallel tool execution support

### Tool Choice Control

```typescript
const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'Calculate 25 * 17',
  tools: {
    calculator: tool({
      description: 'Perform calculations',
      parameters: z.object({
        expression: z.string(),
      }),
      execute: async ({ expression }) => eval(expression),
    }),
  },
  toolChoice: 'required', // Force tool use
  // toolChoice: 'auto', // Let model decide
  // toolChoice: 'none', // Disable tools
  // toolChoice: { type: 'tool', toolName: 'calculator' }, // Force specific tool
});
```

---

## 3. Structured Outputs in Detail

### Type Inference

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
  hobbies: z.array(z.string()),
});

const { object } = await generateObject({
  model: anthropic('claude-3-5-sonnet-20241022'),
  schema,
  prompt: 'Generate a person profile',
});

// TypeScript knows the exact type:
// object: { name: string; age: number; hobbies: string[] }
```

### Complex Nested Schemas

```typescript
const productSchema = z.object({
  products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['electronics', 'clothing', 'food']),
    price: z.number().positive(),
    specs: z.object({
      weight: z.string().optional(),
      dimensions: z.string().optional(),
      materials: z.array(z.string()).optional(),
    }),
    reviews: z.array(z.object({
      rating: z.number().min(1).max(5),
      comment: z.string(),
    })),
  })),
  metadata: z.object({
    totalCount: z.number(),
    generatedAt: z.string(),
  }),
});

const { object } = await generateObject({
  model: anthropic('claude-3-5-sonnet-20241022'),
  schema: productSchema,
  prompt: 'Generate 3 sample products',
});
```

### Streaming Structured Outputs with React

```typescript
'use client';

import { experimental_useObject as useObject } from 'ai/react';
import { z } from 'zod';

export default function RecipeGenerator() {
  const { object, submit, isLoading } = useObject({
    api: '/api/generate-recipe',
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
      }),
    }),
  });

  return (
    <div>
      <button onClick={() => submit('chocolate cake')}>
        Generate Recipe
      </button>

      {object?.recipe && (
        <div>
          <h2>{object.recipe.name}</h2>
          <ul>
            {object.recipe.ingredients?.map((ing, i) => (
              <li key={i}>{ing}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Streaming Patterns

### `useChat` - Chat Interface Hook

The primary hook for building chat UIs with streaming responses.

```typescript
'use client';

import { useChat } from 'ai/react';

export default function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [],
    onFinish: (message) => {
      console.log('Message completed:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### API Route Handler for `useChat`

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    system: 'You are a helpful assistant.',
  });

  return result.toDataStreamResponse();
}
```

### `useChat` with Tools

```typescript
'use client';

import { useChat } from 'ai/react';

export default function ChatWithTools() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat-tools',
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}

          {m.toolInvocations?.map((tool, i) => (
            <div key={i}>
              Tool: {tool.toolName}
              Args: {JSON.stringify(tool.args)}
              Result: {JSON.stringify(tool.result)}
            </div>
          ))}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

```typescript
// app/api/chat-tools/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
    tools: {
      getWeather: {
        description: 'Get weather for a location',
        parameters: z.object({
          location: z.string(),
        }),
        execute: async ({ location }) => {
          // Fetch weather data
          return { temp: 72, conditions: 'sunny' };
        },
      },
    },
  });

  return result.toDataStreamResponse();
}
```

### React Server Components (RSC) Streaming

```typescript
// app/page.tsx (Server Component)
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createStreamableValue } from 'ai/rsc';

export default async function Page() {
  const stream = createStreamableValue('');

  (async () => {
    const { textStream } = await streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt: 'Write a poem about TypeScript',
    });

    for await (const chunk of textStream) {
      stream.update(chunk);
    }

    stream.done();
  })();

  return (
    <div>
      <StreamableText stream={stream.value} />
    </div>
  );
}

function StreamableText({ stream }: { stream: any }) {
  'use client';

  const [text] = useState(stream);

  return <div>{text}</div>;
}
```

### `useCompletion` - Single Completion Hook

For non-chat completions (single prompt/response).

```typescript
'use client';

import { useCompletion } from 'ai/react';

export default function CompletionComponent() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useCompletion({
    api: '/api/completion',
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Complete</button>
      </form>

      <div>{completion}</div>
    </div>
  );
}
```

```typescript
// app/api/completion/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    prompt,
  });

  return result.toDataStreamResponse();
}
```

---

## 5. Provider Setup: Anthropic (Claude)

### Installation

```bash
npm install @ai-sdk/anthropic
```

### Basic Configuration

```typescript
import { anthropic } from '@ai-sdk/anthropic';

// Initialize with API key (recommended: use environment variables)
const model = anthropic('claude-3-5-sonnet-20241022', {
  // Optional configuration
});

// Or configure provider-wide settings
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // baseURL: 'https://api.anthropic.com/v1', // Optional custom endpoint
});

const model = anthropicProvider('claude-3-5-sonnet-20241022');
```

### Available Claude Models

```typescript
// Latest and most capable
anthropic('claude-3-5-sonnet-20241022')

// Opus (highest capability)
anthropic('claude-3-opus-20240229')

// Haiku (fastest, most cost-effective)
anthropic('claude-3-haiku-20240307')

// Legacy
anthropic('claude-3-sonnet-20240229')
```

### Claude-Specific Features

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt: 'Analyze this code',

  // Claude-specific settings
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,

  // System prompt (Claude handles this well)
  system: 'You are an expert code reviewer.',

  // Stop sequences
  stopSequences: ['END_OF_ANALYSIS'],
});
```

### Using Multiple Providers

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

async function generateWithFallback(prompt: string) {
  try {
    return await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt,
    });
  } catch (error) {
    // Fallback to OpenAI
    return await generateText({
      model: openai('gpt-4-turbo'),
      prompt,
    });
  }
}
```

---

## 6. Middleware and Hooks

### Custom Middleware

The AI SDK supports middleware for request/response transformation.

```typescript
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';

const wrappedModel = wrapLanguageModel({
  model: anthropic('claude-3-5-sonnet-20241022'),
  middleware: {
    transformParams: async ({ params }) => {
      // Log or modify parameters before sending
      console.log('Request params:', params);

      return {
        ...params,
        // Add custom headers or modify params
      };
    },
    transformResponse: async ({ response }) => {
      // Log or modify response
      console.log('Response:', response);

      return response;
    },
  },
});
```

### Lifecycle Hooks with `useChat`

```typescript
const { messages, append } = useChat({
  api: '/api/chat',

  // Called when a new message is received
  onResponse: (response) => {
    console.log('Response received:', response);
  },

  // Called when streaming completes
  onFinish: (message) => {
    console.log('Finished message:', message);
    // Save to database, analytics, etc.
  },

  // Error handling
  onError: (error) => {
    console.error('Error:', error);
    // Show user-friendly error message
  },

  // Custom headers
  headers: {
    'Authorization': 'Bearer token',
  },

  // Custom body modifications
  body: {
    userId: 'user123',
  },
});
```

### Server-Side Callbacks

```typescript
const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages,

  onChunk: async ({ chunk }) => {
    // Process each chunk as it arrives
    console.log('Chunk:', chunk);
  },

  onFinish: async ({ text, usage }) => {
    // Log completion, save to DB, update metrics
    await saveToDatabase({
      text,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
    });
  },
});
```

---

## 7. Best Practices

### Error Handling

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

async function safeGenerate(prompt: string) {
  try {
    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt,
      maxRetries: 3, // Automatic retry with exponential backoff
    });

    return { success: true, data: result };
  } catch (error) {
    // Handle specific error types
    if (error.name === 'AI_APICallError') {
      console.error('API call failed:', error.message);
      // Handle API errors (network, rate limits, etc.)
    } else if (error.name === 'AI_InvalidPromptError') {
      console.error('Invalid prompt:', error.message);
      // Handle validation errors
    } else if (error.name === 'AI_InvalidResponseError') {
      console.error('Invalid response:', error.message);
      // Handle malformed responses
    }

    return { success: false, error: error.message };
  }
}
```

### Rate Limiting (Client-Side)

```typescript
'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';

export default function RateLimitedChat() {
  const [requestCount, setRequestCount] = useState(0);
  const MAX_REQUESTS = 10;

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    onFinish: () => {
      setRequestCount(prev => prev + 1);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    if (requestCount >= MAX_REQUESTS) {
      alert('Rate limit exceeded');
      return;
    }
    handleSubmit(e);
  };

  return (
    <form onSubmit={onSubmit}>
      {/* ... */}
      <p>Requests: {requestCount}/{MAX_REQUESTS}</p>
    </form>
  );
}
```

### Rate Limiting (Server-Side with Upstash)

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
});

export async function POST(req: Request) {
  const identifier = req.headers.get('x-forwarded-for') || 'anonymous';

  const { success, limit, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  }

  // Process request
  const { messages } = await req.json();
  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### Streaming with Abort Controllers

```typescript
'use client';

import { useChat } from 'ai/react';
import { useRef } from 'react';

export default function CancellableChat() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const { messages, input, handleInputChange, handleSubmit, stop } = useChat({
    api: '/api/chat',
  });

  const onSubmit = (e: React.FormEvent) => {
    abortControllerRef.current = new AbortController();
    handleSubmit(e, {
      options: {
        signal: abortControllerRef.current.signal,
      },
    });
  };

  const handleStop = () => {
    stop(); // Built-in stop function
    abortControllerRef.current?.abort();
  };

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
        <button type="button" onClick={handleStop}>Stop</button>
      </form>
    </div>
  );
}
```

### Production Configuration

```typescript
// lib/ai-config.ts
import { anthropic } from '@ai-sdk/anthropic';

export const getModel = () => {
  return anthropic('claude-3-5-sonnet-20241022', {
    // Use environment-specific settings
  });
};

export const DEFAULT_GENERATION_CONFIG = {
  maxTokens: 2048,
  temperature: 0.7,
  maxRetries: 3,
  abortSignal: undefined as AbortSignal | undefined,
};

// Use in API routes
import { streamText } from 'ai';
import { getModel, DEFAULT_GENERATION_CONFIG } from '@/lib/ai-config';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: getModel(),
    messages,
    ...DEFAULT_GENERATION_CONFIG,
    system: 'You are a helpful assistant.',
    onFinish: async ({ text, usage }) => {
      // Log metrics
      await logToAnalytics({
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        timestamp: new Date(),
      });
    },
  });

  return result.toDataStreamResponse();
}
```

### Caching Responses

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Simple in-memory cache
const cache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function generateWithCache(prompt: string) {
  const cached = cache.get(prompt);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { text: cached.text, cached: true };
  }

  const result = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    prompt,
  });

  cache.set(prompt, {
    text: result.text,
    timestamp: Date.now(),
  });

  return { text: result.text, cached: false };
}
```

### Monitoring and Logging

```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const startTime = Date.now();
  const { messages } = await req.json();

  try {
    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages,
      onFinish: async ({ text, usage, finishReason }) => {
        const duration = Date.now() - startTime;

        // Log to your analytics service
        await logMetrics({
          duration,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          finishReason,
          model: 'claude-3-5-sonnet-20241022',
          timestamp: new Date(),
        });

        // Alert on errors
        if (finishReason === 'error') {
          await sendAlert('Generation failed', { text, finishReason });
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    await logError(error);
    throw error;
  }
}
```

---

## 8. Latest Version Features (v3.x)

### Key Updates in Recent Versions

1. **Improved Type Safety**: Better TypeScript inference for schemas and tool parameters
2. **Enhanced Streaming**: More efficient streaming protocols with better error handling
3. **Tool Calling Improvements**:
   - Multi-step automatic tool execution
   - Parallel tool execution
   - Better tool choice control
4. **React Server Components Support**: First-class RSC integration
5. **Provider Expansion**: More LLM providers supported out of the box
6. **Middleware System**: Experimental middleware for request/response transformation
7. **Better Error Messages**: More descriptive error messages and error types

### New APIs

```typescript
// experimental_useObject for streaming structured outputs
import { experimental_useObject as useObject } from 'ai/react';

// createStreamableUI for RSC streaming
import { createStreamableUI } from 'ai/rsc';

// wrapLanguageModel for middleware
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';
```

### Breaking Changes from v2 to v3

- `useChat` and `useCompletion` now require explicit API endpoints
- Tool definitions use new `tool()` helper function
- Provider packages now separate (e.g., `@ai-sdk/anthropic`)
- Message format standardized across providers

---

## Common Patterns

### Chat with Message History Persistence

```typescript
'use client';

import { useChat } from 'ai/react';
import { useEffect } from 'react';

export default function PersistentChat() {
  const { messages, append, setMessages } = useChat({
    api: '/api/chat',
    initialMessages: [],
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chat-messages');
    if (saved) {
      setMessages(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('chat-messages', JSON.stringify(messages));
  }, [messages]);

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
    </div>
  );
}
```

### Streaming with Loading States

```typescript
'use client';

import { useChat } from 'ai/react';

export default function ChatWithLoading() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.content}
          {m.role === 'assistant' && isLoading && messages[messages.length - 1].id === m.id && (
            <span className="animate-pulse">...</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Multi-Modal with Image Inputs

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is in this image?' },
        {
          type: 'image',
          image: 'https://example.com/image.jpg' // Or base64 data URL
        },
      ],
    },
  ],
});
```

---

## Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-xxx

# Optional: Custom endpoints
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1

# For rate limiting with Upstash
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx
```

---

## Resources

- Official Docs: https://sdk.vercel.ai/docs
- GitHub: https://github.com/vercel/ai
- Examples: https://sdk.vercel.ai/examples
- Discord: Vercel's AI SDK Community

---

## Summary

The Vercel AI SDK provides a comprehensive toolkit for building AI applications with:

- **Core APIs** for both streaming and non-streaming text/object generation
- **React hooks** for seamless UI integration
- **Tool calling** with type-safe Zod schemas
- **Structured outputs** with automatic validation
- **Multi-provider support** with consistent APIs
- **Production-ready features** like error handling, retries, and lifecycle hooks

The SDK abstracts away provider-specific details while maintaining flexibility for advanced use cases. Its TypeScript-first design ensures type safety throughout your application, from schema definitions to response handling.
