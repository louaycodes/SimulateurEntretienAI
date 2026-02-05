// API Route: /api/interview/next-turn
// Handles interview initialization and turn-based conversation

import { NextRequest, NextResponse } from "next/server";
import { nextTurn, LLMClientError } from "@/lib/llmClient";
import { buildInterviewSystemPrompt } from "@/lib/prompts";

// Server-side session cache (in-memory)
// In production, use Redis or similar
const sessionCache = new Map<string, {
    hasInitialized: boolean;
    interviewParams: any;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}>();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, interviewParams, isInit, candidateText, messages } = body;

        if (!sessionId) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: "INVALID_REQUEST",
                    message: "Missing sessionId",
                    hint: "Session ID is required"
                }
            }, { status: 400 });
        }

        // Get or create session
        let session = sessionCache.get(sessionId);
        if (!session) {
            session = {
                hasInitialized: false,
                interviewParams: interviewParams || {},
                messages: []
            };
            sessionCache.set(sessionId, session);
        }

        // Determine if this is initialization
        const needsInit = isInit || !session.hasInitialized;

        let systemPrompt = "";
        let conversationMessages = messages || session.messages || [];

        if (needsInit) {
            // INITIALIZATION: Build system prompt from interview params
            if (!interviewParams) {
                return NextResponse.json({
                    ok: false,
                    error: {
                        code: "INVALID_REQUEST",
                        message: "Missing interviewParams for initialization",
                        hint: "Interview parameters required for first turn"
                    }
                }, { status: 400 });
            }

            // Build initialization prompt
            systemPrompt = buildInterviewSystemPrompt(interviewParams);

            // Store params in session
            session.interviewParams = interviewParams;
            session.hasInitialized = true;
            sessionCache.set(sessionId, session);

            console.log(`[Interview] Initializing session ${sessionId}`);
            console.log(`[Interview] Params:`, {
                role: interviewParams.role,
                level: interviewParams.level,
                type: interviewParams.interviewType,
                language: interviewParams.language,
                duration: interviewParams.duration
            });

        } else {
            // TURN-BASED: Add candidate's answer as new message
            if (!candidateText || !candidateText.trim()) {
                return NextResponse.json({
                    ok: false,
                    error: {
                        code: "INVALID_REQUEST",
                        message: "Missing candidateText",
                        hint: "Candidate answer text is required for non-init turns"
                    }
                }, { status: 400 });
            }

            // Add candidate message
            const candidateMessage = {
                role: 'user' as const,
                content: candidateText.trim()
            };
            conversationMessages.push(candidateMessage);
            session.messages = conversationMessages;
            sessionCache.set(sessionId, session);

            // Rebuild system prompt from stored params
            systemPrompt = buildInterviewSystemPrompt(session.interviewParams);

            console.log(`[Interview] Turn for session ${sessionId}`);
            console.log(`[Interview] Candidate said: "${candidateText.substring(0, 100)}..."`);
        }

        // Call LLM
        const response = await nextTurn({
            systemPrompt,
            messages: conversationMessages,
            config: {
                temperature: 0.7,
                maxTokens: 1000
            }
        });

        // Add recruiter response to session
        const recruiterMessage = {
            role: 'assistant' as const,
            content: response.say
        };
        session.messages.push(recruiterMessage);
        sessionCache.set(sessionId, session);

        console.log(`[Interview] Recruiter responds: "${response.say.substring(0, 100)}..."`);
        console.log(`[Interview] Scores: total=${response.evaluation.total_score}, tech=${response.evaluation.technical_score}, comm=${response.evaluation.communication_score}, ps=${response.evaluation.problem_solving_score}`);

        // Return response
        return NextResponse.json({
            ok: true,
            data: response,
            sessionState: {
                hasInitialized: session.hasInitialized,
                messageCount: session.messages.length
            }
        });

    } catch (error) {
        console.error("Next turn error:", error);

        if (error instanceof LLMClientError) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: error.code,
                    message: error.message,
                    hint: error.hint
                }
            }, { status: 500 });
        }

        // Unknown error
        return NextResponse.json({
            ok: false,
            error: {
                code: "UNKNOWN_ERROR",
                message: error instanceof Error ? error.message : "Unknown error occurred",
                hint: "Check server logs for details"
            }
        }, { status: 500 });
    }
}

// Cleanup old sessions (call periodically or on server restart)
export function cleanupSessions(maxAgeMs: number = 3600000) {
    // In production, implement proper session expiry
    // For now, just clear all on restart
    sessionCache.clear();
}
