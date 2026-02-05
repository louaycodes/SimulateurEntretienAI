import { SessionData, Role, Level, InterviewType } from "./types";

// Mock session data generator
export function generateMockSession(id: string): SessionData {
    const roles: Role[] = ["DevOps", "Cloud", "Backend", "Cybersecurity", "Data"];
    const levels: Level[] = ["junior", "mid", "senior"];
    const types: InterviewType[] = ["HR", "Tech", "Mixed"];

    const role = roles[Math.floor(Math.random() * roles.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const interviewType = types[Math.floor(Math.random() * types.length)];

    const startTime = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000; // Within last week
    const duration = 15 * 60 * 1000; // 15 minutes

    return {
        id,
        config: {
            role,
            level,
            interviewType,
            language: "EN",
            duration: 20,
        },
        startTime,
        endTime: startTime + duration,
        transcript: [
            {
                id: "1",
                type: "recruiter",
                text: "Hello! Thank you for joining us today. Let's start with a brief introduction. Can you tell me about yourself and your experience?",
                timestamp: startTime,
            },
            {
                id: "2",
                type: "user",
                text: "Sure! I have 3 years of experience in backend development, primarily working with Node.js and Python. I've built several REST APIs and worked with microservices architecture.",
                timestamp: startTime + 30000,
            },
            {
                id: "3",
                type: "recruiter",
                text: "That's great! Can you describe a challenging technical problem you've solved recently?",
                timestamp: startTime + 90000,
            },
            {
                id: "4",
                type: "user",
                text: "Recently, I optimized a database query that was causing performance issues. The query was taking over 5 seconds, and I reduced it to under 200ms by adding proper indexes and restructuring the query.",
                timestamp: startTime + 120000,
            },
        ],
        scores: {
            overall: 75 + Math.floor(Math.random() * 20),
            technical: 70 + Math.floor(Math.random() * 25),
            communication: 75 + Math.floor(Math.random() * 20),
            problemSolving: 70 + Math.floor(Math.random() * 25),
            experience: 65 + Math.floor(Math.random() * 30),
        },
        feedback: {
            impression: Math.random() > 0.3 ? "Lean Hire" : Math.random() > 0.5 ? "Hire" : "No Hire",
            strengths: [
                "Strong technical knowledge and clear communication",
                "Good problem-solving approach with concrete examples",
                "Demonstrated understanding of performance optimization",
            ],
            improvements: [
                "Could provide more details about system design decisions",
                "Consider discussing trade-offs in technical choices",
                "Practice explaining complex concepts more concisely",
            ],
        },
        timeline: [
            {
                timestamp: startTime,
                label: "Introduction",
                description: "Candidate introduced themselves and background",
            },
            {
                timestamp: startTime + 90000,
                label: "Technical Discussion",
                description: "Discussed challenging technical problem",
            },
            {
                timestamp: startTime + 300000,
                label: "System Design",
                description: "Explored system architecture knowledge",
            },
            {
                timestamp: startTime + duration - 60000,
                label: "Closing",
                description: "Q&A and wrap-up",
            },
        ],
    };
}

export function generateMockSessions(count: number = 10): SessionData[] {
    return Array.from({ length: count }, (_, i) => generateMockSession(`session-${i + 1}`));
}

// Mock API functions
export async function fetchSession(id: string): Promise<SessionData> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return generateMockSession(id);
}

export async function fetchSessions(): Promise<SessionData[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockSessions(10);
}

export async function fetchDashboardStats() {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const sessions = generateMockSessions(15);
    const totalSessions = sessions.length;
    const avgScore = Math.round(
        sessions.reduce((sum, s) => sum + (s.scores?.overall || 0), 0) / totalSessions
    );

    return {
        totalSessions,
        avgScore,
        streak: Math.floor(Math.random() * 10) + 1,
        topWeakness: "System Design",
        recentSessions: sessions.slice(0, 5),
    };
}
