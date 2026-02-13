import { SessionData, Role, Level, InterviewType } from "./types";

// Helper to map DB session to Frontend SessionData
function mapSessionToData(dbSession: any): SessionData {
    // Map messages/transcript
    const transcript = (dbSession.messages || []).map((msg: any) => ({
        id: msg.id,
        type: msg.role === 'candidate' ? 'user' : msg.role, // 'user' is expected by UI
        text: msg.text,
        timestamp: Number(msg.timestampMs)
    }));

    // Map scores
    const scores = dbSession.finalReport ? {
        overall: dbSession.finalReport.overallScore,
        technical: dbSession.finalReport.technicalScore,
        communication: dbSession.finalReport.communicationScore,
        problemSolving: dbSession.finalReport.problemSolvingScore,
        experience: dbSession.finalReport.experienceScore
    } : dbSession.overallScore ? {
        overall: dbSession.overallScore,
        technical: dbSession.technicalScore,
        communication: dbSession.communicationScore,
        problemSolving: dbSession.problemSolvingScore,
        experience: dbSession.experienceScore
    } : undefined;

    // Map feedback
    const feedback = dbSession.finalReport ? {
        impression: dbSession.finalReport.impression,
        strengths: dbSession.finalReport.whatIDidWell,
        improvements: dbSession.finalReport.areasForImprovement
    } : undefined;

    return {
        id: dbSession.id,
        status: dbSession.status,
        config: {
            role: dbSession.role as Role,
            level: dbSession.level as Level,
            interviewType: dbSession.interviewType as InterviewType,
            language: dbSession.language || "EN",
            duration: dbSession.durationMinutes || 30,
        },
        startTime: new Date(dbSession.createdAt).getTime(),
        endTime: dbSession.endedAt ? new Date(dbSession.endedAt).getTime() : undefined,
        transcript,
        scores,
        feedback,
        // Timeline is currently not persisted in detail, so we generate a basic one or omit
        timeline: [
            {
                timestamp: new Date(dbSession.createdAt).getTime(),
                label: "Interview Started",
                description: `Started ${dbSession.role} interview`
            },
            ...(dbSession.endedAt ? [{
                timestamp: new Date(dbSession.endedAt).getTime(),
                label: "Interview Ended",
                description: "Session completed"
            }] : [])
        ]
    };
}

// Fetch session by ID
export async function fetchSession(id: string): Promise<SessionData> {
    try {
        const response = await fetch(`/api/sessions/${id}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch session: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.ok) {
            throw new Error(data.error?.message || 'Failed to fetch session data');
        }
        return mapSessionToData(data.session);
    } catch (error) {
        console.error("API Error fetchSession:", error);
        throw error;
    }
}

// Fetch multiple sessions (used internally by dashboard usually)
export async function fetchSessions(): Promise<SessionData[]> {
    try {
        const response = await fetch('/api/sessions/list');
        if (!response.ok) {
            throw new Error('Failed to fetch sessions list');
        }
        const data = await response.json();
        if (!data.ok) return [];

        return data.sessions.map(mapSessionToData);
    } catch (error) {
        console.error("API Error fetchSessions:", error);
        return [];
    }
}

// Fetch dashboard stats
export async function fetchDashboardStats() {
    try {
        const sessions = await fetchSessions();

        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.scores && s.scores.overall > 0);

        const avgScore = completedSessions.length > 0
            ? Math.round(completedSessions.reduce((sum, s) => sum + (s.scores?.overall || 0), 0) / completedSessions.length)
            : 0;

        // Calculate streak (consecutive days with at least one session)
        // Simple logic: sort by date descending
        const sortedSessions = [...sessions].sort((a, b) => b.startTime - a.startTime);

        // Use real recent sessions
        const recentSessions = sortedSessions.slice(0, 5);

        return {
            totalSessions,
            avgScore,
            streak: 0, // Placeholder logic for now
            topWeakness: "N/A", // Would need advanced analysis
            recentSessions: recentSessions,
        };
    } catch (error) {
        console.error("API Error fetchDashboardStats:", error);
        return {
            totalSessions: 0,
            avgScore: 0,
            streak: 0,
            topWeakness: "-",
            recentSessions: []
        };
    }
}
