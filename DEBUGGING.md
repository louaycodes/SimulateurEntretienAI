# 🔧 Debugging Guide - Skill-Sphere

## Common Issues & Solutions

### 1. "Failed to generate question. Check API connection."

#### Cause
- API key not configured
- Wrong API package version
- Network issues

#### Solution

**Step 1: Verify API Key**
```bash
# Check .env.local file exists
cat .env.local

# Should contain:
GROQ_API_KEY=your_api_key_here
```

**Step 2: Verify Environment**
```bash
# Verify GROQ_API_KEY is set
echo $env:GROQ_API_KEY

# Should show your API key value
```

**Step 3: Restart Server**
```bash
# Stop current server (Ctrl+C)
npm run dev
```

**Step 4: Test API**
```bash
# Open browser console (F12)
# Go to http://localhost:3000/settings
# Check API status indicator
```

---

### 2. "Failed to access camera/microphone"

#### Cause
Browser permissions not granted

#### Solution

**Chrome/Edge:**

1. **Click the lock icon** in address bar (left of URL)
2. **Site settings** → Permissions
3. **Camera** → Allow
4. **Microphone** → Allow
5. **Refresh page** (F5)

**Alternative Method:**

1. Open **Chrome Settings** (chrome://settings/content)
2. Go to **Privacy and security** → **Site Settings**
3. Click **Camera** → Find localhost:3000 → Allow
4. Click **Microphone** → Find localhost:3000 → Allow
5. Refresh page

**Firefox:**

1. Click **shield icon** in address bar
2. **Permissions** → Camera/Microphone
3. Select **Allow**
4. Refresh page

**If Still Not Working:**

1. **Check device availability**
   ```
   - Go to Settings page
   - See if devices are listed
   - If empty, check Windows settings
   ```

2. **Windows Settings**
   ```
   - Open Windows Settings
   - Privacy → Camera → Allow apps to access camera
   - Privacy → Microphone → Allow apps to access microphone
   - Make sure Chrome/Edge is allowed
   ```

3. **Use Text Input Instead**
   ```
   - Click keyboard icon in interview
   - Type your answers
   - Works without camera/mic
   ```

---

### 3. "401 Unauthorized" from Groq

#### Cause
API key is invalid or not set

#### Solution

```bash
# Check your .env.local has the correct key
# Get a free key at https://console.groq.com

# Restart server after changing .env.local
npm run dev
```

---

### 4. Speech Recognition Not Working

#### Cause
Browser doesn't support Web Speech API

#### Solution

**Supported Browsers:**
- ✅ Chrome (recommended)
- ✅ Edge
- ⚠️ Firefox (limited support)
- ❌ Safari (not supported)

**Workaround:**
1. Click **keyboard icon** in interview
2. Use **text input mode**
3. Type your answers instead

---

### 5. "ENOTFOUND" Error (Fonts)

#### Cause
No internet connection or firewall blocking Google Fonts

#### Solution

**This is just a warning, app still works!**

If you want to fix it:

1. **Check internet connection**
2. **Check firewall settings**
3. **Or use local fonts** (edit `app/layout.tsx`)

```typescript
// Remove Google Fonts import
// import { Inter } from "next/font/google";

// Use system fonts instead
const inter = {
  className: "font-sans"
};
```

---

### 6. TypeScript Errors (clsx)

#### Error
```
Cannot find module 'clsx'
```

#### Solution

```bash
npm install clsx
```

---

### 7. Interview Doesn't Start

#### Symptoms
- Click "Start Interview"
- Nothing happens
- No questions appear

#### Debug Steps

**1. Check Browser Console (F12)**
```
Look for errors in red
Common errors:
- API key not configured
- Network error
- Permission denied
```

**2. Check Network Tab**
```
- Open DevTools (F12)
- Go to Network tab
- Click "Start Interview"
- Look for failed requests (red)
- Check response details
```

**3. Check API Route**
```bash
# Test generate endpoint
curl -X POST http://localhost:3000/api/interview/generate \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "Test",
    "messages": [],
    "config": {}
  }'

# Should return streaming data
# If error, check server logs
```

**4. Check Server Logs**
```
Look at terminal where npm run dev is running
Check for errors or warnings
```

---

### 8. Streaming Not Working

#### Symptoms
- Questions appear all at once
- No word-by-word animation

#### This is normal!
The new API returns complete responses. Streaming is simulated client-side for better UX.

---

### 9. Low Scores / Bad Feedback

#### Not a bug!
This means you need to improve your answers.

**Tips:**
- Be more specific
- Use concrete examples
- Mention technologies/tools
- Explain your reasoning
- Quantify achievements

---

### 10. Session Not Saving

#### Current Limitation
Sessions are stored in browser memory only (Zustand).

**Workaround:**
- Don't close browser tab during interview
- Complete interview in one session
- Copy feedback before closing

**Future Feature:**
- Backend database for persistent storage
- Session history page
- Export as PDF

---

## Advanced Debugging

### Enable Verbose Logging

**1. Add to `.env.local`:**
```env
NEXT_PUBLIC_DEBUG=true
```

**2. Check logs in browser console:**
```javascript
// Open console (F12)
// You'll see detailed logs:
[API] Generate request: {...}
[API] Generate response: {...}
[Interview] State change: {...}
```

### Test API Directly

**Generate Endpoint:**
```bash
curl -X POST http://localhost:3000/api/interview/generate \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a recruiter",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "config": {
      "role": "DevOps",
      "level": "Senior",
      "temperature": 0.7,
      "maxTokens": 1000
    }
  }'
```

**Summary Endpoint:**
```bash
curl -X POST http://localhost:3000/api/interview/summary \
  -H "Content-Type: application/json" \
  -d '{
    "summaryPrompt": "Generate a summary",
    "transcript": [],
    "privateNotes": []
  }'
```

### Check Package Versions

```bash
npm list @google/genai
npm list next
npm list react
npm list zustand
```

Expected versions:
- `next`: 14.2.x
- `react`: 18.x
- `zustand`: 4.x

---

## Still Having Issues?

### Collect Debug Info

1. **Browser Console Errors** (F12 → Console)
2. **Network Tab** (F12 → Network → Failed requests)
3. **Server Logs** (Terminal output)
4. **Environment** (.env.local contents - hide API key!)
5. **Package versions** (npm list)

### Reset Everything

```bash
# Stop server
# Ctrl+C

# Clear node_modules
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# Restart
npm run dev
```

### Check System Requirements

- ✅ Node.js 18+
- ✅ npm 9+
- ✅ Modern browser (Chrome/Edge recommended)
- ✅ Internet connection
- ✅ Groq API key (free at https://console.groq.com)

---

## Quick Fixes Checklist

- [ ] `GROQ_API_KEY` in `.env.local`
- [ ] Key obtained from https://console.groq.com
- [ ] Server restarted after `.env.local` changes
- [ ] Browser permissions granted (camera/mic)
- [ ] Using Chrome or Edge browser
- [ ] Internet connection working
- [ ] No firewall blocking requests
- [ ] Latest code from repository

---

## Contact

If none of these solutions work, please:
1. Check GitHub issues
2. Create new issue with debug info
3. Include error messages and logs

---

**Last Updated:** 2026-02-04
