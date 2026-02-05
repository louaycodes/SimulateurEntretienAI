# 🚀 Quick Start Guide - Skill-Sphere

## Get Started in 5 Minutes!

### Step 1: Get Your Gemini API Key (2 minutes)

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy your API key (starts with `AIza...`)

> **Note:** The free tier includes 60 requests/minute, perfect for testing!

---

### Step 2: Configure Your Project (1 minute)

1. **Open your project folder**
   ```bash
   cd "C:\Users\user\Desktop\PROJETS POUR MON GITHUB\AI ENTRETIEN SIMULATEUR"
   ```

2. **Your `.env.local` file is already configured!**
   ```env
   GEMINI_API_KEY=AIzaSyCcC5uhrqOBQ1i62LiOLEPZyE20DB7YQvk
   ```

---

### Step 3: Start the Application (1 minute)

The server is already running! Open your browser:

```
http://localhost:3000
```

---

### Step 4: Start Your First Interview (1 minute)

1. **Go to Onboarding**
   - Click "Start Interview" on homepage
   - Or visit: http://localhost:3000/onboarding

2. **Configure Your Interview**
   - **Role**: DevOps, Cloud, Backend, Cybersecurity, or Data
   - **Level**: Junior, Mid, or Senior
   - **Type**: HR, Technical, or Mixed
   - **Language**: English or French
   - **Duration**: 10-60 minutes

3. **Grant Permissions**
   - Allow camera access
   - Allow microphone access

4. **Start Interview**
   - Click "Start Interview"
   - AI recruiter will greet you
   - Answer questions via voice or text
   - Watch your responses stream in real-time!

---

## 🎯 Quick Test

### Test the API Connection

1. Visit: http://localhost:3000/settings
2. Look for "Google Gemini API Status"
3. Should show: **✅ API Key Configured**

If you see ❌, check your `.env.local` file.

---

## 🎤 Using Voice vs. Text

### Voice Input (Recommended)
- Click the microphone icon
- Speak naturally
- See live transcription
- AI processes when you finish

### Text Input (Fallback)
- Click the keyboard icon
- Type your answer
- Press Enter or click Send

---

## 📊 After the Interview

1. **Interview Ends Automatically**
   - Based on duration you set
   - Or click "End Interview"

2. **View Your Results**
   - Complete transcript
   - 4 scores:
     - Total Score
     - Technical Skills
     - Communication
     - Problem Solving
   - Strengths & Weaknesses
   - Improvement Plan

---

## 🔧 Troubleshooting

### "API Key Not Configured"

**Solution:**
1. Check `.env.local` exists in project root
2. Verify `GEMINI_API_KEY=AIza...` is present
3. Restart the dev server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### "Failed to generate question"

**Possible Causes:**
1. **No internet connection** - Check your network
2. **Invalid API key** - Verify key at https://aistudio.google.com
3. **Rate limit exceeded** - Wait 1 minute and try again

**Quick Fix:**
- Open browser console (F12)
- Look for error details
- Share error message if issue persists

### Speech Recognition Not Working

**Browser Support:**
- ✅ Chrome (recommended)
- ✅ Edge
- ⚠️ Firefox (limited)
- ❌ Safari (not supported)

**Fallback:**
- Use text input mode (keyboard icon)
- Works in all browsers

### Camera/Microphone Not Working

1. **Check browser permissions**
   - Click lock icon in address bar
   - Allow camera and microphone

2. **Check device settings**
   - Go to Settings page
   - Select correct devices

3. **Restart browser**
   - Close all tabs
   - Reopen application

---

## 💡 Tips for Best Experience

### Before Interview

1. **Test Your Setup**
   - Visit Settings page
   - Check API status
   - Test camera/microphone
   - Choose correct devices

2. **Choose Quiet Environment**
   - Minimize background noise
   - Good lighting for camera
   - Stable internet connection

3. **Prepare Mentally**
   - Treat it like a real interview
   - Have examples ready
   - Be specific in answers

### During Interview

1. **Speak Clearly**
   - Moderate pace
   - Avoid long pauses
   - Complete sentences

2. **Be Specific**
   - Use concrete examples
   - Mention technologies/tools
   - Explain your reasoning

3. **Watch the Avatar**
   - **Idle** - Waiting to start
   - **Listening** - Recording your answer
   - **Thinking** - AI processing
   - **Speaking** - Question being generated

### After Interview

1. **Review Transcript**
   - See what you said
   - Identify patterns
   - Note areas to improve

2. **Study Feedback**
   - Read strengths (keep doing!)
   - Read weaknesses (focus here)
   - Follow improvement plan

3. **Practice Again**
   - Try different roles
   - Increase difficulty level
   - Track your progress

---

## 🎓 Example Interview Flow

### 1. Onboarding
```
Role: DevOps Engineer
Level: Senior
Type: Technical
Language: English
Duration: 20 minutes
```

### 2. Interview Starts
```
AI: "Hello! I'm excited to speak with you today about the Senior DevOps 
     Engineer position. Let's start with an introduction. Can you tell me 
     about your experience with CI/CD pipelines?"

You: "Sure! I've been working with CI/CD for 5 years. I've implemented 
      Jenkins pipelines for microservices, using Docker and Kubernetes..."

AI: "That's great experience. Can you walk me through a specific challenge 
     you faced with a CI/CD pipeline and how you resolved it?"
```

### 3. Interview Continues
- 5-7 questions total
- Follow-ups based on your answers
- Difficulty adjusts to your level
- AI evaluates continuously

### 4. Results
```
Total Score: 85/100
Technical: 82/100
Communication: 90/100
Problem Solving: 83/100

Strengths:
- Clear communication and structured answers
- Strong practical experience with modern DevOps tools
- Good problem-solving approach

Weaknesses:
- Could provide more specific metrics
- Some answers lacked depth on security aspects
- Limited discussion of monitoring strategies

Improvement Plan:
- Practice quantifying your achievements (e.g., "reduced deploy time by 40%")
- Study DevSecOps practices and security scanning tools
- Prepare examples of monitoring and observability implementations
```

---

## 🚀 Next Steps

### Explore Features

1. **Try Different Roles**
   - DevOps, Cloud, Backend, Cybersecurity, Data
   - Each has role-specific questions

2. **Adjust Difficulty**
   - Junior: Basic concepts
   - Mid: Practical experience
   - Senior: Architecture and leadership

3. **Change Languages**
   - Practice in English
   - Practice in French
   - Improve language skills

### Customize Settings

1. **Visit Settings Page**
   - http://localhost:3000/settings

2. **Configure Preferences**
   - Language
   - Text-to-Speech (coming soon)
   - Auto Subtitles
   - Gaze Tips

3. **Select Devices**
   - Choose best camera
   - Choose best microphone

### Track Progress

1. **Session History** (coming soon)
   - View past interviews
   - Compare scores over time
   - See improvement trends

2. **Export Results** (coming soon)
   - Download as PDF
   - Share with mentors
   - Add to portfolio

---

## 📞 Need Help?

### Documentation

- **README**: Full documentation
- **DEBUGGING.md**: Troubleshooting guide
- **walkthrough.md**: Technical details

### Common Questions

**Q: Is my data stored?**
A: Currently, sessions are stored in browser memory only. No server storage.

**Q: How much does it cost?**
A: Free tier is sufficient for testing. Paid tier available for heavy use.

**Q: Can I use my own questions?**
A: Not yet, but custom templates are planned for Phase 6.

**Q: Does it work offline?**
A: No, requires internet connection for Gemini API.

**Q: Is it mobile-friendly?**
A: Desktop/laptop recommended. Mobile app planned for future.

---

## 🎉 You're Ready!

Open http://localhost:3000 and start your first interview!

**Good luck! 🚀**
