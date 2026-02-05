# API Documentation - Skill-Sphere

## Overview

Skill-Sphere uses Next.js API Routes to securely communicate with Google Gemini API. All routes are server-side only and never expose the API key to the client.

---

## Base URL

```
http://localhost:3000/api
```

In production:
```
https://your-domain.com/api
```

---

## Endpoints

### 1. Generate Interview Question

**Endpoint:** `POST /api/interview/generate`

**Purpose:** Generate the next interview question or response from the AI recruiter.

**Authentication:** None (API key handled server-side)

**Request Body:**
```typescript
{
  "systemPrompt": string,      // System prompt defining recruiter behavior
  "messages": Array<{          // Conversation history
    "role": "user" | "assistant",
    "content": string
  }>,
  "config": {                  // Interview configuration
    "role": string,            // e.g., "DevOps"
    "level": string,           // "junior" | "mid" | "senior"
    "interviewType": string,   // "HR" | "Tech" | "Mixed"
    "language": string,        // "EN" | "FR"
    "duration": number,        // minutes
    "temperature"?: number,    // 0.0-1.0 (default: 0.7)
    "maxTokens"?: number       // default: 1000
  }
}
```

**Response:** Server-Sent Events (SSE) stream

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"token": "Can"}
data: {"token": " you"}
data: {"token": " explain"}
data: {"token": " your"}
data: {"token": " experience"}
data: {"token": " with"}
data: {"token": " CI/CD"}
data: {"token": "?"}
data: {"done": true, "fullText": "Can you explain your experience with CI/CD?"}
```

**Error Response:**
```json
{
  "error": "GEMINI_API_KEY not configured"
}
```
Status: 500

```json
{
  "error": "Missing required fields"
}
```
Status: 400

**Example Usage:**
```typescript
const response = await fetch('/api/interview/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    systemPrompt: "You are a recruiter...",
    messages: [
      { role: "user", content: "Tell me about yourself" }
    ],
    config: {
      role: "DevOps",
      level: "Senior",
      interviewType: "Tech",
      language: "EN",
      duration: 20
    }
  }),
});

// Handle streaming
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.token) {
        console.log(data.token); // Display token
      }
      if (data.done) {
        console.log('Complete:', data.fullText);
      }
    }
  }
}
```

---

### 2. Generate Interview Summary

**Endpoint:** `POST /api/interview/summary`

**Purpose:** Generate final evaluation and feedback after interview completion.

**Authentication:** None (API key handled server-side)

**Request Body:**
```typescript
{
  "summaryPrompt": string,     // Prompt for summary generation
  "transcript": Array<{        // Complete conversation
    "type": "recruiter" | "user",
    "text": string,
    "timestamp": number
  }>,
  "privateNotes": Array<{      // Evaluation notes
    "timestamp": number,
    "signals": string[],
    "score_hint": {
      "total": number,
      "technical": number,
      "communication": number,
      "problem_solving": number
    }
  }>
}
```

**Response:**
```json
{
  "impression": "Hire" | "Lean Hire" | "No Hire",
  "scores": {
    "total": 85,
    "technical": 80,
    "communication": 90,
    "problem_solving": 85
  },
  "strengths": [
    "Clear communication and structured answers",
    "Strong practical experience with modern tools",
    "Good problem-solving approach"
  ],
  "weaknesses": [
    "Could provide more specific metrics",
    "Some answers lacked depth on security",
    "Limited discussion of monitoring"
  ],
  "corrected_examples": [
    {
      "original": "I use Docker for containers",
      "improved": "I use Docker for containerization, specifically implementing multi-stage builds to reduce image size by 60% and improve deployment speed"
    }
  ],
  "improvement_plan": "Focus on quantifying achievements, study DevSecOps practices, and prepare examples of monitoring implementations"
}
```

**Error Response:**
```json
{
  "error": "GEMINI_API_KEY not configured"
}
```
Status: 500

```json
{
  "error": "Missing summaryPrompt"
}
```
Status: 400

**Example Usage:**
```typescript
const response = await fetch('/api/interview/summary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    summaryPrompt: buildSummaryPrompt(transcript, privateNotes, config),
    transcript: messages,
    privateNotes: evaluationNotes,
  }),
});

const summary = await response.json();
console.log('Impression:', summary.impression);
console.log('Total Score:', summary.scores.total);
console.log('Strengths:', summary.strengths);
```

---

## Data Models

### RecruiterResponse

Expected JSON structure from AI (parsed from response):

```typescript
interface RecruiterResponse {
  say: string;                    // What recruiter says to candidate
  type: "question" | "followup" | "closing";
  rubric: "hr" | "tech" | "closing";
  evaluation: {
    total_score: number;          // 0-100
    technical_score: number;      // 0-100
    communication_score: number;  // 0-100
    problem_solving_score: number; // 0-100
    signals: string[];            // ["confident", "vague", "good_example"]
  };
}
```

### InterviewSummary

```typescript
interface InterviewSummary {
  impression: "Hire" | "Lean Hire" | "No Hire";
  scores: {
    total: number;
    technical: number;
    communication: number;
    problem_solving: number;
  };
  strengths: string[];
  weaknesses: string[];
  corrected_examples?: Array<{
    original: string;
    improved: string;
  }>;
  improvement_plan: string;
}
```

---

## Rate Limiting

### Google Gemini Free Tier

- **Requests per minute:** 60
- **Requests per day:** 1,500
- **Tokens per minute:** 32,000

### Handling Rate Limits

**Error from Gemini:**
```json
{
  "error": {
    "code": 429,
    "message": "Resource has been exhausted (e.g. check quota)."
  }
}
```

**Client-Side Handling:**
```typescript
try {
  const response = await fetch('/api/interview/generate', {...});
  if (response.status === 429) {
    // Show user-friendly message
    showToast('error', 'Too many requests. Please wait a moment and try again.');
    // Implement exponential backoff
    await new Promise(resolve => setTimeout(resolve, 5000));
    // Retry
  }
} catch (error) {
  console.error('API Error:', error);
}
```

---

## Error Handling

### Common Errors

**1. Missing API Key**
```json
{
  "error": "GEMINI_API_KEY not configured"
}
```
**Solution:** Add API key to `.env.local`

**2. Invalid Request**
```json
{
  "error": "Missing required fields"
}
```
**Solution:** Check request body structure

**3. Network Error**
```json
{
  "error": "Failed to generate response"
}
```
**Solution:** Check internet connection

**4. JSON Parsing Error**
```
AI response not in valid JSON format
```
**Solution:** Fallback structure used automatically

---

## Security

### API Key Protection

✅ **Server-Side Only**
```typescript
// ✅ CORRECT - Server-side (API route)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ❌ WRONG - Client-side
const genAI = new GoogleGenerativeAI('AIza...');
```

✅ **Environment Variables**
```env
# .env.local (gitignored)
GEMINI_API_KEY=AIzaSyCcC5uhrqOBQ1i62LiOLEPZyE20DB7YQvk

# .env.example (template)
GEMINI_API_KEY=your_api_key_here
```

✅ **Next.js API Routes**
- Run on server
- Never expose to client
- Secure by default

### CORS

API routes are same-origin, no CORS issues.

For external access (future):
```typescript
export async function POST(request: NextRequest) {
  // Add CORS headers if needed
  const headers = {
    'Access-Control-Allow-Origin': 'https://your-domain.com',
    'Access-Control-Allow-Methods': 'POST',
  };
  
  // ... rest of handler
}
```

---

## Testing

### Manual Testing

**Test Generation Endpoint:**
```bash
curl -X POST http://localhost:3000/api/interview/generate \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a recruiter",
    "messages": [{"role": "user", "content": "Hello"}],
    "config": {
      "role": "DevOps",
      "level": "Senior",
      "interviewType": "Tech",
      "language": "EN",
      "duration": 20
    }
  }'
```

**Test Summary Endpoint:**
```bash
curl -X POST http://localhost:3000/api/interview/summary \
  -H "Content-Type: application/json" \
  -d '{
    "summaryPrompt": "Generate summary",
    "transcript": [],
    "privateNotes": []
  }'
```

### Automated Testing

```typescript
// Example test with Jest
describe('Interview API', () => {
  it('should generate question', async () => {
    const response = await fetch('/api/interview/generate', {
      method: 'POST',
      body: JSON.stringify({
        systemPrompt: 'Test',
        messages: [],
        config: { /* ... */ }
      })
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });
});
```

---

## Performance

### Latency

- **Generation:** 1-3 seconds
- **Streaming:** Tokens appear immediately
- **Summary:** 2-4 seconds

### Optimization

**1. Caching (Future)**
```typescript
// Cache system prompts
const promptCache = new Map();

function getCachedPrompt(config) {
  const key = JSON.stringify(config);
  if (!promptCache.has(key)) {
    promptCache.set(key, buildInterviewSystemPrompt(config));
  }
  return promptCache.get(key);
}
```

**2. Request Batching (Future)**
- Combine multiple requests
- Reduce API calls
- Improve efficiency

---

## Monitoring

### Logging

```typescript
// API Route logging
console.log('[API] Generate request:', {
  role: config.role,
  level: config.level,
  messageCount: messages.length,
});

console.log('[API] Generate response:', {
  duration: Date.now() - startTime,
  tokenCount: fullText.length,
});
```

### Error Tracking

```typescript
// Sentry integration (future)
import * as Sentry from '@sentry/nextjs';

try {
  // ... API logic
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

---

## Changelog

### v3.0.0 (Current)
- ✅ Migrated to Google Gemini API
- ✅ Added streaming support (SSE)
- ✅ Enhanced evaluation (4 scores)
- ✅ Server-side API routes
- ✅ Removed local LLM support

### v2.0.0 (Deprecated)
- Local Ollama integration
- Mock mode
- 2-score evaluation

### v1.0.0 (Deprecated)
- WebSocket-based backend
- Basic interview flow

---

## Support

For issues or questions:
1. Check [README.md](../README.md)
2. Check [DEBUGGING.md](../DEBUGGING.md)
3. Open GitHub issue

---

**Last Updated:** 2026-02-04
