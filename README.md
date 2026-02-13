# AI Interview Simulator (Groq + Next.js + PostgreSQL)

## Features
- **Live AI Interview**: Powered by Groq (Llama 3.3 70B) for ultra-fast responses.
- **Real-time Speech Transcription**: Web Speech API integration for seamless voice interaction.
- **AI Voice Recruiter**: Text-to-Speech synthesis for a realistic interview experience.
- **Automatic Scoring**: Real-time evaluation of:
  - Technical Skills
  - Communication
  - Problem Solving
  - Overall Performance
- **Weakness Analysis**: Detailed feedback on areas for improvement.
- **Persistent Session Storage**: Save and review past interviews using PostgreSQL.
- **Final Report Dashboard**: Comprehensive performance analytics.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI Model**: Groq API (Llama 3.3 70B Versatile / Llama 3.1 8B Instant)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Speech**: Web Speech API (Browser Native)
- **Styling**: Tailwind CSS + Framer Motion

## Installation (Local Setup)

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Groq API Key (Get one for free at [console.groq.com](https://console.groq.com))

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-interview-simulator.git
   cd ai-interview-simulator
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your `GROQ_API_KEY`.

3. **Start Database**
   ```bash
   docker compose up -d
   ```

4. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

5. **Install Dependencies**
   ```bash
   npm install
   ```

6. **Start Application**
   ```bash
   npm run dev
   ```

   Open http://localhost:3000 to start your interview!

## How It Works

1. **Initialization**: You select a role (e.g., DevOps) and level (e.g., Senior).
2. **Interview Loop**:
   - The AI generates a context-aware question.
   - You answer via voice or text.
   - The AI evaluates your answer internally (scoring 0-100) and generates a follow-up.
3. **Conclusion**:
   - The session ends when you click "End Interview".
   - The AI generates a structured JSON report with strengths, weaknesses, and final scores.
   - Data is saved to PostgreSQL for review.

## API Routes

- `POST /api/interview/next-turn`: Handles the core conversation loop. Receives message history, calls Groq, and returns the recruiter's response + internal evaluation.
- `POST /api/sessions/[id]/end`: Finalizes the session, requesting a comprehensive report from Groq and storing it in the DB.
- `GET /api/sessions/[id]`: Retrieves session data, transcript, and report for the frontend review page.

## Troubleshooting

- **Groq 401 / 429 Errors**: Check your API key. Free tier keys have rate limits. The app handles 429s with backoff, but you may need to wait.
- **Microphone Issues**: Ensure you've granted browser permissions. Works best in Chrome/Edge.
- **Database Connection**: Ensure Docker container is running (`docker ps`) and port 5432 is available.
- **Build Errors**: Run `npm install` to ensure all type definitions are up to date.

## License
MIT
