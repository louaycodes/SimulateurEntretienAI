# 🎯 Skill-Sphere – AI Interview Simulator

**Skill-Sphere** is a cutting-edge AI-powered interview simulator designed to help job seekers practice and improve their interview skills. Powered by **Google Gemini API**, it provides realistic, adaptive interview experiences with real-time feedback and comprehensive performance evaluation.

## ✨ Features

### 🤖 AI-Powered Interviews
- **Google Gemini Integration** - State-of-the-art AI recruiter powered by Gemini 1.5 Pro
- **Adaptive Questioning** - AI adjusts difficulty and follow-ups based on your responses
- **Multi-Turn Conversations** - Natural, flowing interview dialogue
- **Continuous Evaluation** - Real-time scoring across 4 key dimensions

### 🎭 Realistic Interview Experience
- **Animated AI Recruiter Avatar** - Visual feedback with states (idle, listening, thinking, speaking)
- **Live Speech Recognition** - Answer questions naturally using your voice
- **Streaming Responses** - See AI responses appear in real-time
- **Professional Atmosphere** - Simulates real interview conditions

### 📊 Comprehensive Evaluation
- **4-Dimensional Scoring**:
  - **Total Score** (0-100)
  - **Technical Skills** (0-100)
  - **Communication** (0-100)
  - **Problem Solving** (0-100)
- **Detailed Feedback** - Strengths, weaknesses, and improvement plans
- **Corrected Examples** - See how you could have answered better
- **Hiring Impression** - Hire / Lean Hire / No Hire recommendation

### 🎨 Customizable Interviews
- **Multiple Roles**: DevOps, Cloud, Backend, Cybersecurity, Data
- **Experience Levels**: Junior, Mid, Senior
- **Interview Types**: HR, Technical, Mixed
- **Languages**: English & French
- **Adjustable Duration**: 10-60 minutes

### 🎥 Professional Setup
- **Video & Audio** - Practice with camera and microphone
- **Live Transcription** - See what you're saying in real-time
- **Text Input Fallback** - Type answers if voice isn't available
- **Device Selection** - Choose your preferred camera/microphone

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Google Gemini API Key** (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/skill-sphere.git
   cd skill-sphere
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Get your Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key (free tier: 60 requests/minute)
   - Copy your API key

4. **Configure environment**
   ```bash
   # Create .env.local file
   cp .env.example .env.local
   
   # Edit .env.local and add your API key:
   GEMINI_API_KEY=your_api_key_here
   ```

5. **Test API Connection (IMPORTANT!)**
   
   Before running the app, verify your API is working:
   
   ```bash
   # Test from terminal
   $env:GEMINI_API_KEY='your_api_key_here'; node scripts/test-llm.mjs
   
   # Expected output:
   # ✅ PASS - API is working!
   # Response time: ~5s
   ```
   
   If the test fails, check:
   - ✅ API key is correct and not expired
   - ✅ Internet connection is working
   - ✅ No firewall blocking requests
   - ✅ Model name is correct (`gemini-3-flash-preview`)

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   ```
   http://localhost:3000
   ```

### Testing LLM API Locally

**Always test the API before running the app!**

#### Terminal Test (Recommended)

```bash
# Quick test
$env:GEMINI_API_KEY='your_key'; node scripts/test-llm.mjs

# With custom model
$env:GEMINI_API_KEY='your_key'; $env:GEMINI_MODEL='gemini-3-flash-preview'; node scripts/test-llm.mjs
```

**Expected Output:**
```
🧪 Testing Gemini Interactions API...

Provider: Gemini Interactions API
Model: gemini-3-flash-preview
Endpoint: https://generativelanguage.googleapis.com/v1beta/interactions

✅ PASS - API is working!
Response time: 5.25s
AI Response:
{
  "ok": true,
  "msg": "pong"
}

✨ You can now run the app with confidence!
```

#### In-App Test

1. Start the server: `npm run dev`
2. Open http://localhost:3000/settings
3. Check API status indicator
4. Should show: ✅ API Key Configured

#### Troubleshooting

| Error | Solution |
|-------|----------|
| `❌ API key missing` | Add `GEMINI_API_KEY` to `.env.local` |
| `❌ HTTP 401/403` | Invalid API key, check your credentials |
| `❌ HTTP 404` | Wrong model name, use `gemini-3-flash-preview` |
| `❌ HTTP 429` | Rate limit exceeded, wait and retry |
| `❌ Network error` | Check internet connection and firewall |

## 📖 Usage

### Starting an Interview

1. **Configure Your Interview** (`/onboarding`)
   - Select your target role (e.g., DevOps, Cloud Engineer)
   - Choose experience level (Junior/Mid/Senior)
   - Pick interview type (HR/Technical/Mixed)
   - Set language (English/French)
   - Choose duration (10-60 minutes)

2. **Grant Permissions**
   - Allow camera and microphone access
   - Test your setup

3. **Start Interview** (`/interview`)
   - AI recruiter introduces themselves
   - Answer questions via voice or text
   - See live transcription of your answers
   - Watch AI think and respond in real-time

4. **Review Performance** (`/session/[id]`)
   - View complete transcript
   - See your scores across all dimensions
   - Read detailed feedback
   - Get improvement recommendations

### Settings

Configure your preferences at `/settings`:
- **Language**: English or French
- **Text-to-Speech**: Hear questions aloud (coming soon)
- **Auto Subtitles**: Show live transcription
- **Gaze Tips**: Camera positioning hints
- **Devices**: Select camera/microphone

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- TailwindCSS
- Framer Motion (animations)
- Zustand (state management)

**AI & APIs:**
- Google Gemini 1.5 Pro
- Web Speech API (voice recognition)
- MediaDevices API (camera/microphone)

**Backend:**
- Next.js API Routes (server-side)
- Server-Sent Events (streaming)

### Project Structure

```
skill-sphere/
├── app/
│   ├── api/
│   │   └── interview/
│   │       ├── generate/route.ts    # AI question generation
│   │       └── summary/route.ts     # Final evaluation
│   ├── interview/page.tsx           # Live interview room
│   ├── onboarding/page.tsx          # Interview configuration
│   ├── session/[id]/page.tsx        # Results review
│   └── settings/page.tsx            # User preferences
├── components/
│   ├── RecruiterAvatar.tsx          # Animated AI avatar
│   ├── TranscriptLive.tsx           # Live transcription
│   └── ui/                          # Reusable UI components
├── lib/
│   ├── geminiClient.ts              # Gemini API client
│   ├── prompts.ts                   # AI prompt templates
│   ├── speech.ts                    # Speech recognition
│   ├── media.ts                     # Camera/microphone utils
│   └── types.ts                     # TypeScript types
└── store/
    ├── interview.ts                 # Interview state
    └── preferences.ts               # User preferences
```

### Security

- ✅ **API Key Server-Side Only** - Never exposed to client
- ✅ **Next.js API Routes** - Secure backend endpoints
- ✅ **Environment Variables** - `.env.local` for secrets
- ✅ **No Client-Side API Calls** - All LLM requests go through server

## 🎓 How It Works

### Interview Flow

1. **Initialization**
   - System prompt built from user configuration
   - Sent to Gemini with interview context (role, level, type, language)

2. **Question Generation**
   - AI generates contextual questions
   - Returns structured JSON with question + evaluation criteria
   - Streams response for real-time display

3. **Answer Processing**
   - User answers via voice (Web Speech API) or text
   - Answer sent to AI with conversation history
   - AI evaluates and generates follow-up or next question

4. **Continuous Scoring**
   - Every response includes updated scores
   - Tracks: total, technical, communication, problem_solving
   - Stores private notes for final summary

5. **Final Summary**
   - Complete transcript + evaluation notes sent to AI
   - Generates comprehensive report:
     - Hiring impression (Hire/Lean Hire/No Hire)
     - Final scores
     - Strengths & weaknesses
     - Corrected answer examples
     - Improvement plan

### AI Prompt Engineering

The system uses carefully crafted prompts to ensure:
- **Realistic behavior** - Acts like a professional recruiter
- **Structured output** - Always returns valid JSON
- **Continuous evaluation** - Updates scores after each answer
- **Adaptive difficulty** - Adjusts based on candidate level
- **Language consistency** - Maintains selected language throughout

## 🔧 Configuration

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional (for future features)
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### Gemini API Settings

Default configuration (can be adjusted in code):
- **Model**: `gemini-1.5-pro`
- **Temperature**: 0.7 (interview), 0.3 (summary)
- **Max Tokens**: 1000 (interview), 2000 (summary)

## 📊 Evaluation Criteria

### Scoring System

**Total Score (0-100)**
- Weighted average of all dimensions
- Considers technical depth, communication clarity, and problem-solving approach

**Technical Score (0-100)**
- Accuracy and depth of technical knowledge
- Use of industry-standard terminology
- Practical experience demonstrated

**Communication Score (0-100)**
- Clarity and structure of answers
- Confidence and professionalism
- Active listening and engagement

**Problem Solving Score (0-100)**
- Logical reasoning and approach
- Ability to break down complex problems
- Creative and practical solutions

### Hiring Impressions

- **Hire** (80-100): Strong candidate, recommend hiring
- **Lean Hire** (60-79): Promising candidate, some areas to improve
- **No Hire** (<60): Significant gaps, needs more preparation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini** - Powering the AI interviewer
- **Next.js Team** - Amazing framework
- **Vercel** - Deployment platform
- **Open Source Community** - For all the great libraries

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Built with ❤️ to help you ace your next interview!**
