# Contexte Technique — Skill-Sphere (SimulateurEntretienAI)

> Simulateur d'entretiens d'embauche IT en temps réel, propulsé par IA (Groq / LLaMA).

---

## 1. Informations Générales

| Clé | Valeur |
|---|---|
| **Nom du package** | `skill-sphere` |
| **Framework** | Next.js 14 (App Router) |
| **Langage** | TypeScript 5.4 |
| **Styling** | TailwindCSS 3.4 + PostCSS |
| **Port par défaut** | `3000` (`NEXT_PUBLIC_APP_URL=http://localhost:3000`) |
| **Base de données** | PostgreSQL 16 (via Docker Compose) |
| **ORM** | Prisma 5.22 |
| **LLM Provider** | Groq API (OpenAI-compatible REST) avec modèle `llama-3.3-70b-versatile` (fallback: `llama-3.1-8b-instant`) |
| **State Management** | Zustand 4.5 (avec `persist` middleware → localStorage) |

---

## 2. Variables d'Environnement

Fichier `.env.local` (basé sur `.env.example`) :

```env
GROQ_API_KEY=<clé API Groq>
GROQ_MODEL=llama-3.3-70b-versatile       # Modèle LLM principal
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interview_simulator?schema=public
NEXT_PUBLIC_APP_URL=http://localhost:3000  # URL publique de l'app
```

---

## 3. Structure du Projet

```
SimulateurEntretienAI/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Inter font, ToastProvider)
│   ├── page.tsx                  # Landing page (/)
│   ├── globals.css               # Styles globaux
│   │
│   ├── auth/
│   │   ├── login/page.tsx        # Page de connexion (/auth/login)
│   │   └── register/page.tsx     # Page d'inscription (/auth/register)
│   │
│   ├── onboarding/page.tsx       # Page d'onboarding — config de l'entretien (/onboarding)
│   ├── interview/page.tsx        # Page principale d'entretien live (/interview)
│   ├── dashboard/page.tsx        # Dashboard — historique des sessions (/dashboard)
│   ├── session/[id]/page.tsx     # Détail d'une session passée (/session/:id)
│   ├── settings/page.tsx         # Page de réglages (/settings)
│   │
│   └── api/                      # API Routes (Next.js Route Handlers)
│       ├── interview/
│       │   ├── generate/route.ts
│       │   ├── next-turn/route.ts
│       │   └── summary/route.ts
│       ├── llm/
│       │   └── ping/route.ts
│       ├── sessions/
│       │   ├── create/route.ts
│       │   ├── list/route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── end/route.ts
│       │       └── message/route.ts
│       └── status/route.ts
│
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx        # Layout principal (sidebar, nav)
│   ├── ui/                       # Composants UI réutilisables
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   ├── FilmTranscript.tsx        # Affichage transcript style film
│   ├── PreparationOverlay.tsx    # Overlay de préparation avant entretien
│   ├── RecruiterAvatar.tsx       # Avatar animé du recruteur IA
│   ├── SubtitlesOverlay.tsx      # Sous-titres en temps réel
│   ├── TranscriptLive.tsx        # Transcript live pendant l'entretien
│   └── TranscriptModal.tsx       # Modal de transcript complet
│
├── lib/                          # Bibliothèques / utilitaires
│   ├── db.ts                     # Client Prisma (singleton)
│   ├── llmClient.ts              # Client LLM centralisé (Groq REST API)
│   ├── prompts.ts                # Prompts système pour l'IA
│   ├── types.ts                  # Types TypeScript partagés
│   ├── speech.ts                 # Web Speech API (reconnaissance vocale)
│   ├── tts.ts                    # Text-to-Speech (Web Speech Synthesis)
│   ├── ttsQueue.ts               # File d'attente TTS
│   ├── media.ts                  # Gestion des médias (caméra/micro)
│   ├── persistence.ts            # Persistance locale des sessions
│   ├── mock-api.ts               # API mock pour dev sans LLM
│   └── websocket.ts              # Client WebSocket (non utilisé activement)
│
├── store/                        # Zustand stores (state management client)
│   ├── auth.ts                   # Store d'authentification (fake)
│   ├── interview.ts              # Store principal d'entretien
│   ├── llm.ts                    # Store de config LLM
│   ├── preferences.ts            # Store de préférences utilisateur
│   └── ttsStore.ts               # Store TTS
│
├── prisma/
│   ├── schema.prisma             # Schéma de base de données
│   └── prisma.config.ts          # Config Prisma
│
├── docker-compose.yml            # PostgreSQL 16 + Adminer
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.mjs
```

---

## 4. Pages de l'Application (App Router)

| Route | Fichier | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing page publique (hero, features, témoignages, CTA) |
| `/auth/login` | `app/auth/login/page.tsx` | Formulaire de connexion (email + password) |
| `/auth/register` | `app/auth/register/page.tsx` | Formulaire d'inscription (email + password + name) |
| `/onboarding` | `app/onboarding/page.tsx` | Configuration de l'entretien (rôle, niveau, type, langue, durée) |
| `/interview` | `app/interview/page.tsx` | **Page principale** — Entretien live avec le recruteur IA (caméra, micro, TTS, transcript) |
| `/dashboard` | `app/dashboard/page.tsx` | Historique des sessions passées avec scores |
| `/session/[id]` | `app/session/[id]/page.tsx` | Détail complet d'une session (transcript, scores, rapport final) |
| `/settings` | `app/settings/page.tsx` | Réglages (TTS, langue, périphériques audio/vidéo, config LLM) |

---

## 5. API Routes Exposées

### 5.1. Interview — Interaction avec le LLM

#### `POST /api/interview/generate`

Génération libre d'une question d'entretien.

**Input (JSON body):**
```json
{
  "systemPrompt": "string (obligatoire)",
  "messages": [{ "role": "user|assistant", "content": "string" }],
  "config": { "temperature": 0.7 }
}
```

**Output:**
```json
{
  "ok": true,
  "data": {
    "say": "Question du recruteur",
    "type": "question|followup|closing",
    "rubric": "hr|tech|closing",
    "evaluation": { "total_score": 0-100, ... }
  }
}
```

---

#### `POST /api/interview/next-turn`

**Route principale** — Gère l'initialisation de l'entretien ET chaque tour de conversation.

**Input (JSON body):**
```json
{
  "sessionId": "string (obligatoire)",
  "isInit": true|false,
  "interviewParams": {                    // Obligatoire si isInit=true
    "role": "DevOps|Cloud|Backend|Cybersecurity|Data",
    "level": "junior|mid|senior",
    "interviewType": "HR|Tech|Mixed",
    "language": "FR|EN",
    "duration": 15
  },
  "candidateText": "string",             // Obligatoire si isInit=false
  "messages": [{ "role": "user|assistant", "content": "string" }]
}
```

**Output (succès):**
```json
{
  "ok": true,
  "data": {
    "say": "Ce que le recruteur dit au candidat",
    "type": "question|followup|closing",
    "rubric": "hr|tech|closing",
    "evaluation": {
      "total_score": 75,
      "technical_score": 70,
      "communication_score": 80,
      "problem_solving_score": 65,
      "experience_score": 60,
      "signals": ["good_structure", "weak_reasoning"]
    }
  },
  "meta": {
    "requestId": "req-...",
    "latency": 1200,
    "llmLatency": 950
  }
}
```

> **Note** : Un cache de session in-memory (`Map`) est maintenu côté serveur. Les sessions sont identifiées par `sessionId`.

---

#### `POST /api/interview/summary`

Génère le résumé final d'un entretien.

**Input:**
```json
{
  "summaryPrompt": "string (prompt complet avec transcript et notes)"
}
```

**Output:**
```json
{
  "ok": true,
  "data": {
    "impression": "Hire|Lean Hire|No Hire",
    "scores": { "total": 75, "technical": 70, "communication": 80, "problem_solving": 65 },
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "corrected_examples": [{ "original": "...", "improved": "..." }],
    "improvement_plan": "..."
  }
}
```

---

### 5.2. LLM — Health Check

#### `GET /api/llm/ping`

Test de connectivité avec l'API Groq.

**Output:**
```json
{
  "ok": true,
  "provider": "Groq",
  "model": "llama-3.3-70b-versatile",
  "latency": 450
}
```

---

### 5.3. Status

#### `GET /api/status`

Health check global (teste le LLM).

**Output:** Identique à `/api/llm/ping` en cas de succès.

---

### 5.4. Sessions — Persistance en base de données

#### `POST /api/sessions/create`

Crée une nouvelle session d'entretien en BDD.

**Input:**
```json
{
  "role": "Backend",
  "level": "senior",
  "interviewType": "Tech",
  "language": "FR",
  "durationMinutes": 30
}
```

**Output:**
```json
{ "ok": true, "sessionId": "uuid-..." }
```

---

#### `GET /api/sessions/list`

Liste toutes les sessions (triées par date décroissante).

**Output:**
```json
{
  "ok": true,
  "sessions": [
    {
      "id": "uuid",
      "createdAt": "ISO date",
      "endedAt": "ISO date | null",
      "role": "Backend",
      "level": "senior",
      "interviewType": "Tech",
      "status": "running|ended",
      "recruiterImpression": "Hire|Lean Hire|No Hire|null",
      "overallScore": 75
    }
  ]
}
```

---

#### `GET /api/sessions/[id]`

Récupère une session avec ses messages et son rapport final.

**Output:**
```json
{
  "ok": true,
  "session": {
    "id": "uuid",
    "role": "Backend",
    "level": "senior",
    "status": "ended",
    "messages": [
      { "id": "uuid", "role": "recruiter|user", "text": "...", "timestampMs": 123456, "elapsedSec": 45 }
    ],
    "finalReport": {
      "impression": "Hire",
      "overallScore": 85,
      "technicalScore": 80,
      "communicationScore": 90,
      "problemSolvingScore": 75,
      "experienceScore": 0,
      "whatIDidWell": [],
      "areasForImprovement": ["...", "..."],
      "rawModelOutput": "..."
    }
  }
}
```

---

#### `POST /api/sessions/[id]/message`

Sauvegarde un message (recruteur ou candidat) dans une session.

**Input:**
```json
{
  "role": "recruiter|user",
  "text": "Le contenu du message",
  "timestampMs": 1713200000000,
  "elapsedSec": 120,
  "recruiterMsgId": "optional-uuid"
}
```

**Output:** `{ "ok": true }`

> **Note** : En cas de DB indisponible, retourne `{ "ok": true }` quand même (graceful degradation pour ne pas bloquer l'entretien).

---

#### `POST /api/sessions/[id]/end`

Termine un entretien : appelle le LLM pour générer l'évaluation finale, met à jour la session en BDD, et sauvegarde le rapport final.

**Input:**
```json
{
  "messages": [
    { "type": "recruiter|user", "text": "..." }
  ]
}
```

**Output:**
```json
{
  "ok": true,
  "finalReport": {
    "recruiter_impression": "Hire|Lean Hire|No Hire",
    "metrics": {
      "total_score": 75,
      "technical_score": 70,
      "communication_score": 80,
      "problem_solving_score": 65
    },
    "weaknesses": ["point 1", "point 2", "point 3"]
  }
}
```

---

## 6. Schéma de Base de Données (Prisma)

```
┌──────────────────────┐
│  InterviewSession    │
├──────────────────────┤
│ id (UUID, PK)        │
│ createdAt            │
│ endedAt?             │
│ role                 │
│ level                │
│ interviewType        │
│ language             │
│ durationMinutes?     │
│ status (default:     │
│   "running")         │
│ recruiterImpression? │
│ overallScore?        │
│ technicalScore?      │
│ communicationScore?  │
│ problemSolvingScore? │
│ experienceScore?     │
├──────────────────────┤
│  1 ──► N messages    │
│  1 ──► N evaluations │
│  1 ──► 1 finalReport │
└──────────────────────┘

┌──────────────────────┐
│  InterviewMessage    │
├──────────────────────┤
│ id (UUID, PK)        │
│ sessionId (FK)       │
│ role                 │
│ text                 │
│ timestampMs (BigInt) │
│ elapsedSec           │
│ recruiterMsgId?      │
│ createdAt            │
└──────────────────────┘

┌──────────────────────┐
│ InterviewEvaluation  │
├──────────────────────┤
│ id (UUID, PK)        │
│ sessionId (FK)       │
│ turnIndex            │
│ overallScore         │
│ technicalScore       │
│ communicationScore   │
│ problemSolvingScore  │
│ experienceScore      │
│ signals (JSON)       │
│ notesPrivate (JSON)  │
│ createdAt            │
└──────────────────────┘

┌──────────────────────┐
│ InterviewFinalReport │
├──────────────────────┤
│ sessionId (PK, FK)   │
│ impression           │
│ overallScore         │
│ technicalScore       │
│ communicationScore   │
│ problemSolvingScore  │
│ experienceScore      │
│ whatIDidWell (JSON)   │
│ areasForImprovement  │
│   (JSON)             │
│ rawModelOutput       │
│ createdAt            │
└──────────────────────┘
```

Tables PostgreSQL mappées : `interview_sessions`, `interview_messages`, `interview_evaluations`, `interview_final_reports`.

---

## 7. Système d'Authentification

### ⚠️ Auth **FAKE** (pas de vrai backend auth)

L'authentification est **simulée** côté client uniquement via Zustand + localStorage :

- **Store** : `store/auth.ts` → `useAuthStore`
- **Login** : accepte n'importe quel email/password, crée un user fictif (`id: "user-1"`) après un `setTimeout(500ms)`
- **Register** : idem, crée le même user fictif
- **Persistence** : Zustand `persist` middleware → `localStorage` key `auth-storage`
- **Aucune API route d'auth** : pas de `/api/auth/*`
- **Aucune protection de route côté serveur** : toutes les API routes sont accessibles sans token

> **Impact** : Les API routes (`/api/*`) sont **ouvertes et non protégées**. N'importe quel client HTTP peut les appeler sans authentification.

---

## 8. Dépendances Principales

### Runtime

| Package | Rôle |
|---|---|
| `next` ^14.2 | Framework React full-stack (App Router) |
| `react` / `react-dom` ^18.3 | UI library |
| `@prisma/client` ^5.22 | ORM — accès PostgreSQL |
| `prisma` ^5.22 | CLI et engine Prisma |
| `zustand` ^4.5 | State management léger (stores client) |
| `zod` ^3.25 | Validation de schémas (API inputs, formulaires) |
| `react-hook-form` ^7.51 | Gestion de formulaires |
| `@hookform/resolvers` ^3.3 | Intégration Zod ↔ React Hook Form |
| `framer-motion` ^11.0 | Animations UI (transitions, page entries) |
| `lucide-react` ^0.378 | Icônes SVG |
| `clsx` ^2.1 | Utilitaire de classes CSS conditionnelles |

### DevDependencies

| Package | Rôle |
|---|---|
| `typescript` ^5.4 | Langage |
| `tailwindcss` ^3.4 | CSS utility-first |
| `postcss` ^8.4 | Pipeline CSS |
| `autoprefixer` ^10.4 | Préfixes CSS auto |
| `eslint` / `eslint-config-next` | Linting |

---

## 9. Infrastructure Docker

Le fichier `docker-compose.yml` fournit :

1. **PostgreSQL 16 Alpine** sur le port `5432`
   - User : `skillsphere` / Password : `skillsphere_dev` / DB : `skillsphere`
   - Volume persistant `postgres_data`
   - Healthcheck intégré
2. **Adminer** (interface web d'admin DB) sur le port `8080`

Scripts npm associés :
```bash
npm run db:up        # docker compose up -d
npm run db:down      # docker compose down
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio
npm run db:push      # prisma db push
```

---

## 10. Architecture LLM (lib/llmClient.ts)

Le client LLM est **entièrement server-side** et communique avec l'API Groq :

```
Frontend (browser)
    │  POST /api/interview/next-turn
    ▼
Next.js API Route (server)
    │  nextTurn() / generateSummary() / generateFinalReport()
    ▼
lib/llmClient.ts (server-only)
    │  makeGroqRequest() → HTTPS vers api.groq.com
    ▼
Groq API (OpenAI-compatible)
    │  /openai/v1/chat/completions
    ▼
LLaMA 3.3 70B Versatile
```

Mécanismes intégrés :
- **Rate limiting global** : 500ms minimum entre chaque requête
- **Retry avec backoff exponentiel** : jusqu'à 3 retries pour les erreurs 429
- **Fallback model** : si le modèle principal est déprécié, bascule vers `llama-3.1-8b-instant`
- **Extraction JSON robuste** : gère les réponses markdown, code blocks, etc.
- **Validation Zod** des réponses du modèle

---

## 11. Fonctionnalités Côté Client

### Speech Recognition (lib/speech.ts)
- Utilise la **Web Speech API** native du navigateur
- Deux modes : `WebSpeechRecognition` (micro) et `TextInputRecognition` (fallback texte)
- Supporte FR et EN

### Text-to-Speech (lib/tts.ts + lib/ttsQueue.ts)
- Utilise la **Web Speech Synthesis API** native
- Singleton `TTSManager` avec sélection automatique de voix par langue
- File d'attente pour les messages successifs

### Gestion des Médias (lib/media.ts)
- Accès caméra/micro via `getUserMedia`

---

## 12. Consommation Externe

### Comment l'application est censée être utilisée

1. **Application web autonome** : l'utilisateur accède à `http://localhost:3000` dans un navigateur
2. **Flux utilisateur** :
   - `/` → Landing page → `/auth/register` ou `/auth/login` (fake auth)
   - `/onboarding` → Configuration de l'entretien (rôle, niveau, type, langue, durée)
   - `/interview` → Entretien live (caméra + micro + TTS + transcript en temps réel)
   - `/dashboard` → Historique des sessions
   - `/session/:id` → Détail d'une session avec rapport final

3. **API REST consommable** : Les API routes sous `/api/*` peuvent être appelées par n'importe quel client HTTP (pas d'auth requise). Format de réponse uniforme :
   ```json
   { "ok": true|false, "data": {...}, "error": { "code": "...", "message": "...", "hint": "..." } }
   ```

### Points d'intégration potentiels

| Endpoint | Usage externe |
|---|---|
| `POST /api/interview/next-turn` | Faire tourner un entretien IA de manière programmatique |
| `POST /api/sessions/create` | Créer une session depuis un autre frontend |
| `GET /api/sessions/list` | Récupérer l'historique des entretiens |
| `GET /api/sessions/[id]` | Récupérer le détail d'un entretien |
| `POST /api/sessions/[id]/end` | Terminer un entretien et obtenir le rapport final |
| `GET /api/status` | Health check pour monitoring |

---

## 13. Zustand Stores (État Client)

| Store | Fichier | Persistence | Rôle |
|---|---|---|---|
| `useAuthStore` | `store/auth.ts` | localStorage (`auth-storage`) | Auth simulée (user, login, logout) |
| `useInterviewStore` | `store/interview.ts` | **Non** (mémoire seule) | État complet de l'entretien en cours (messages, statuts, audio, TTS, timers) |
| `useLLMStore` | `store/llm.ts` | localStorage (`llm-settings`) | Config LLM client (provider, model, température) |
| `usePreferencesStore` | `store/preferences.ts` | localStorage (`preferences-storage`) | Préférences utilisateur (langue, TTS, sous-titres, périphériques) |
| `useTTSStore` | `store/ttsStore.ts` | localStorage (partiel) | Paramètres TTS (voix, débit, hauteur, volume) |

---

## 14. Scripts NPM

```bash
npm run dev          # Démarre le serveur de dev Next.js (port 3000)
npm run build        # Build de production
npm run start        # Démarre le serveur de production
npm run lint         # ESLint
npm run format       # Prettier — formatte tout le projet
npm run db:up        # Lance PostgreSQL + Adminer via Docker
npm run db:down      # Arrête les conteneurs Docker
npm run db:migrate   # Prisma migrate dev
npm run db:studio    # Ouvre Prisma Studio (GUI DB)
npm run db:push      # Push le schéma Prisma vers la DB
```
