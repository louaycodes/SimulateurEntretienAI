// API Route: /api/interview/next-turn
// Handles interview initialization and turn-based conversation
// WITH COMPREHENSIVE ERROR HANDLING AND VALIDATION

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nextTurn, LLMClientError } from "@/lib/llmClient";
import { buildInterviewSystemPrompt } from "@/lib/prompts";

// Zod schemas for validation
const InterviewParamsSchema = z.object({
    role: z.string().min(1),
    level: z.string().min(1),
    interviewType: z.string().min(1),
    language: z.string().min(1),
    duration: z.number().optional()
});

const RequestBodySchema = z.object({
    sessionId: z.string().min(1, "Session ID is required"),
    isInit: z.boolean(),
    interviewParams: InterviewParamsSchema.optional(),
    candidateText: z.string().optional(),
    messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
    }))
});

// Server-side session cache (in-memory)
const sessionCache = new Map<string, {
    hasInitialized: boolean;
    interviewParams: any;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}>();

// Response schema validation
const RecruiterResponseSchema = z.object({
    say: z.string().min(1),
    type: z.string(),
    rubric: z.string(),
    evaluation: z.object({
        total_score: z.number(),
        technical_score: z.number(),
        communication_score: z.number(),
        problem_solving_score: z.number(),
        signals: z.array(z.string()).optional()
    })
});

export async function POST(request: NextRequest) {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    console.log(`[${requestId}] POST /api/interview/next-turn - Request received`);

    try {
        // Parse and validate request body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            console.error(`[${requestId}] Invalid JSON in request body`);
            return NextResponse.json({
                ok: false,
                error: {
                    code: "INVALID_JSON",
                    message: "Request body must be valid JSON",
                    hint: "Check your request payload format",
                    requestId
                }
            }, { status: 400 });
        }

        // Validate with Zod
        const validation = RequestBodySchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.error(`[${requestId}] Validation failed: ${errors}`);
            return NextResponse.json({
                ok: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid request parameters",
                    hint: errors,
                    requestId
                }
            }, { status: 400 });
        }

        const { sessionId, interviewParams, isInit, candidateText, messages } = validation.data;

        console.log(`[${requestId}] Session: ${sessionId}, isInit: ${isInit}, hasText: ${!!candidateText}`);

        // Get or create session
        let session = sessionCache.get(sessionId);
        if (!session) {
            session = {
                hasInitialized: false,
                interviewParams: interviewParams || {},
                messages: []
            };
            sessionCache.set(sessionId, session);
            console.log(`[${requestId}] Created new session: ${sessionId}`);
        }

        // Determine if this is initialization
        const needsInit = isInit || !session.hasInitialized;

        let systemPrompt = "";
        let conversationMessages = messages || session.messages || [];

        if (needsInit) {
            // INITIALIZATION
            if (!interviewParams) {
                console.error(`[${requestId}] Missing interviewParams for init`);
                return NextResponse.json({
                    ok: false,
                    error: {
                        code: "MISSING_PARAMS",
                        message: "Interview parameters required for initialization",
                        hint: "Provide role, level, interviewType, and language",
                        requestId
                    }
                }, { status: 400 });
            }

            systemPrompt = buildInterviewSystemPrompt(interviewParams);
            session.interviewParams = interviewParams;
            session.hasInitialized = true;
            sessionCache.set(sessionId, session);
            console.log(`[${requestId}] Initializing session with params:`, interviewParams);
        } else {
            // TURN-BASED
            if (!candidateText || candidateText.trim().length === 0) {
                console.error(`[${requestId}] Missing candidateText for turn`);
                return NextResponse.json({
                    ok: false,
                    error: {
                        code: "MISSING_TEXT",
                        message: "Candidate text required for interview turn",
                        hint: "Provide candidateText in request body",
                        requestId
                    }
                }, { status: 400 });
            }

            const candidateMessage = { role: 'user' as const, content: candidateText.trim() };
            conversationMessages.push(candidateMessage);
            session.messages = conversationMessages;
            sessionCache.set(sessionId, session);

            systemPrompt = buildInterviewSystemPrompt(session.interviewParams);
            console.log(`[${requestId}] Processing turn - Candidate: "${candidateText.substring(0, 50)}..."`);
        }

        // Call LLM with timing
        const llmStartTime = Date.now();
        let response;

        try {
            response = await nextTurn({
                systemPrompt,
                messages: conversationMessages,
                config: { temperature: 0.7 }
            });
        } catch (llmError) {
            const llmLatency = Date.now() - llmStartTime;
            console.error(`[${requestId}] LLM call failed after ${llmLatency}ms:`, llmError);

            if (llmError instanceof LLMClientError) {
                // Return 200 with ok:false for model errors (not 500)
                return NextResponse.json({
                    ok: false,
                    error: {
                        code: llmError.code,
                        message: llmError.message,
                        hint: llmError.hint,
                        requestId
                    },
                    meta: {
                        requestId,
                        latency: Date.now() - startTime,
                        llmLatency
                    }
                }, { status: 200 }); // 200 with ok:false for expected errors
            }

            throw llmError; // Re-throw unexpected errors
        }

        const llmLatency = Date.now() - llmStartTime;
        console.log(`[${requestId}] LLM response received in ${llmLatency}ms`);

        // Validate response schema
        const responseValidation = RecruiterResponseSchema.safeParse(response);
        if (!responseValidation.success) {
            const errors = responseValidation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            console.error(`[${requestId}] Invalid model response schema: ${errors}`);
            console.error(`[${requestId}] Raw response:`, JSON.stringify(response).substring(0, 200));

            return NextResponse.json({
                ok: false,
                error: {
                    code: "INVALID_MODEL_JSON",
                    message: "Model returned invalid response format",
                    hint: "Model must return strict JSON with required fields: say, type, rubric, evaluation",
                    requestId
                },
                meta: {
                    requestId,
                    latency: Date.now() - startTime,
                    llmLatency
                }
            }, { status: 200 }); // 200 with ok:false
        }

        // Add to history
        if (response.say) {
            const recruiterMessage = { role: 'assistant' as const, content: response.say };
            session.messages.push(recruiterMessage);
            sessionCache.set(sessionId, session);
        }

        const totalLatency = Date.now() - startTime;
        console.log(`[${requestId}] Success - Total: ${totalLatency}ms, LLM: ${llmLatency}ms`);

        return NextResponse.json({
            ok: true,
            data: response,
            meta: {
                requestId,
                latency: totalLatency,
                llmLatency
            }
        }, {
            headers: {
                'X-Request-Id': requestId
            }
        });

    } catch (error) {
        const totalLatency = Date.now() - startTime;
        console.error(`[${requestId}] Unexpected error after ${totalLatency}ms:`, error);

        // 500 only for truly unexpected errors
        return NextResponse.json({
            ok: false,
            error: {
                code: "INTERNAL_ERROR",
                message: error instanceof Error ? error.message : "An unexpected error occurred",
                hint: "Check server logs for details. RequestId: " + requestId,
                requestId
            },
            meta: {
                requestId,
                latency: totalLatency
            }
        }, { status: 500 });
    }
}

// Cleanup old sessions
export function cleanupSessions(maxAgeMs: number = 3600000) {
    sessionCache.clear();
}
