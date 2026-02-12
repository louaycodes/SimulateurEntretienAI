// Centralized LLM Client (Server-Side Only)
// Uses Groq OpenAI-compatible REST API

import https from 'https';

import { LLMProvider } from './types';

// Error codes for typed error handling
export type LLMErrorCode =
    | "API_KEY_MISSING"
    | "INVALID_ARGUMENT"
    | "PERMISSION_DENIED"
    | "NOT_FOUND"
    | "RESOURCE_EXHAUSTED"
    | "NETWORK_ERROR"
    | "JSON_PARSE_FAILED"
    | "INVALID_MODEL_JSON"
    | "MODEL_DEPRECATED"
    | "UNKNOWN_ERROR";

export interface LLMError {
    code: LLMErrorCode;
    message: string;
    hint: string;
    details?: any;
}

export class LLMClientError extends Error {
    code: LLMErrorCode;
    hint: string;
    details?: any;

    constructor(code: LLMErrorCode, message: string, hint: string, details?: any) {
        super(message);
        this.name = 'LLMClientError';
        this.code = code;
        this.hint = hint;
        this.details = details;
    }
}

// Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

// Global rate limiter: enforce minimum gap between requests
let lastRequestTimestamp = 0;
const MIN_REQUEST_GAP_MS = 500; // 0.5 seconds between requests (Groq is faster)

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 3000; // 3 seconds

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Single raw request to Groq REST API (no retry)
 * Uses OpenAI-compatible chat completions endpoint
 */
async function makeGroqRequestOnce(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature: number,
    model: string
): Promise<string> {
    if (!GROQ_API_KEY) {
        throw new LLMClientError(
            "API_KEY_MISSING",
            "GROQ_API_KEY environment variable not set",
            "Add GROQ_API_KEY to your .env.local file"
        );
    }

    // STRICT OpenAI Request Format
    const requestBody = JSON.stringify({
        model,
        messages: messages.map(m => ({
            role: m.role,
            content: m.content
        })),
        temperature,
        stream: false
    });

    const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const latency = Date.now() - startTime;
                console.log(`[LLM] Provider: Groq, Model: ${model}, Status: ${res.statusCode}, Latency: ${latency}ms`);

                // Handle HTTP errors
                if (res.statusCode !== 200) {
                    let errorData;
                    try {
                        errorData = JSON.parse(data);
                    } catch (e) {
                        errorData = { message: data };
                    }

                    // Log full error details
                    console.error(`[LLM] Groq Error Details:`, JSON.stringify(errorData, null, 2));

                    // Map Groq/OpenAI error to typed error
                    if (res.statusCode === 400) {
                        // Check if it's a model usage error (often 400 or 404 depending on API)
                        const msg = errorData.error?.message?.toLowerCase() || '';
                        if (msg.includes('model') && (msg.includes('deprecated') || msg.includes('not found') || msg.includes('access'))) {
                            reject(new LLMClientError(
                                "MODEL_DEPRECATED",
                                `Model '${model}' issue: ${errorData.error?.message}`,
                                "Model might be deprecated or invalid.",
                                errorData
                            ));
                            return;
                        }

                        const message = errorData.error?.message || 'Invalid request';
                        reject(new LLMClientError(
                            "INVALID_ARGUMENT",
                            message,
                            "Check request format. Groq expects OpenAI-compatible messages array.",
                            errorData
                        ));
                    } else if (res.statusCode === 401) {
                        reject(new LLMClientError(
                            "PERMISSION_DENIED",
                            errorData.error?.message || "Invalid API key",
                            "Check your GROQ_API_KEY in .env.local",
                            errorData
                        ));
                    } else if (res.statusCode === 404) {
                        reject(new LLMClientError(
                            "MODEL_DEPRECATED",
                            `Model '${model}' not found (404)`,
                            "Check if model exists.",
                            errorData
                        ));
                    } else if (res.statusCode === 429) {
                        reject(new LLMClientError(
                            "RESOURCE_EXHAUSTED",
                            "API rate limit reached",
                            "Wait a moment and try again. Groq free tier has rate limits.",
                            errorData
                        ));
                    } else if (res.statusCode! >= 500) {
                        reject(new LLMClientError(
                            "UNKNOWN_ERROR",
                            `Groq provider error (HTTP ${res.statusCode})`,
                            "Groq may be experiencing issues. Try again later.",
                            errorData
                        ));
                    } else {
                        reject(new LLMClientError(
                            "UNKNOWN_ERROR",
                            `HTTP ${res.statusCode}: ${errorData.error?.message || res.statusMessage}`,
                            "Check server logs for details",
                            errorData
                        ));
                    }
                    return;
                }

                // Parse response
                let response;
                try {
                    response = JSON.parse(data);
                } catch (error) {
                    reject(new LLMClientError(
                        "JSON_PARSE_FAILED",
                        "Invalid JSON response from API",
                        "API returned non-JSON data",
                        { rawData: data }
                    ));
                    return;
                }

                // Extract text from OpenAI-compatible response
                if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
                    reject(new LLMClientError(
                        "JSON_PARSE_FAILED",
                        "Missing choices array in response",
                        "API response structure is invalid",
                        response
                    ));
                    return;
                }

                const text = response.choices[0]?.message?.content;
                if (!text || typeof text !== 'string') {
                    reject(new LLMClientError(
                        "JSON_PARSE_FAILED",
                        "Missing message.content in response",
                        "API response structure is invalid",
                        response
                    ));
                    return;
                }

                resolve(text);
            });
        });

        req.on('error', (error) => {
            reject(new LLMClientError(
                "NETWORK_ERROR",
                "Network request failed",
                "Check your internet connection",
                error
            ));
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Make a request to Groq REST API with retry + exponential backoff + fallback model
 */
async function makeGroqRequest(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature: number = 0.4
): Promise<string> {
    // Global rate limiting: wait if we're sending too fast
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimestamp;
    if (timeSinceLastRequest < MIN_REQUEST_GAP_MS) {
        const waitTime = MIN_REQUEST_GAP_MS - timeSinceLastRequest;
        console.log(`[LLM] Rate limiter: waiting ${waitTime}ms before next request`);
        await sleep(waitTime);
    }
    lastRequestTimestamp = Date.now();

    let lastError: LLMClientError | null = null;
    let currentModel = GROQ_MODEL;
    let isFallback = false;

    // We allow retries. If we hit a model error, we switch to fallback and reset retry count partially?
    // Or simpler: Just standard retries. If error is MODEL_DEPRECATED and NOT fallback, switch and continue.

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await makeGroqRequestOnce(messages, temperature, currentModel);
            return result;
        } catch (error) {
            lastError = error instanceof LLMClientError ? error : new LLMClientError("UNKNOWN_ERROR", "Unknown error", "", error);

            if (lastError.code === 'RESOURCE_EXHAUSTED') {
                if (attempt < MAX_RETRIES) {
                    const backoffDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                    console.warn(`[LLM] Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${Math.ceil(backoffDelay / 1000)}s...`);
                    await sleep(backoffDelay);
                    lastRequestTimestamp = Date.now();
                    continue; // Retry loop
                }
            } else if (lastError.code === 'MODEL_DEPRECATED') {
                if (!isFallback) {
                    console.warn(`[LLM] Model '${currentModel}' deprecated/not found. Switching to fallback '${FALLBACK_MODEL}'.`);
                    currentModel = FALLBACK_MODEL;
                    isFallback = true;
                    // Don't count this as a retry attempt, or do? 
                    // Let's just continue loop. If attempt was 0, it becomes 1. 
                    // If we want to guarantee retries for fallback too, we might need more logic.
                    // But usually switching model works immediately if quota/rate limit allows.
                    continue;
                } else {
                    // Already fallback failed
                    throw lastError;
                }
            } else {
                // Non-retryable error
                throw error;
            }
        }
    }

    // All retries failed
    throw lastError || new LLMClientError(
        "RESOURCE_EXHAUSTED",
        "API rate limit exceeded after all retries",
        "Wait a few minutes and try again"
    );
}

/**
 * Extract JSON from text (handles markdown code blocks)
 */
function extractJSON(text: string): any {
    // Remove markdown code blocks if present
    let cleaned = text.trim();

    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
    }

    // Try to find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new LLMClientError(
            "INVALID_MODEL_JSON",
            "No JSON object found in response",
            "AI did not return valid JSON",
            { rawText: text }
        );
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        throw new LLMClientError(
            "INVALID_MODEL_JSON",
            "Invalid JSON in AI response",
            "AI returned malformed JSON",
            { rawText: text, jsonMatch: jsonMatch[0] }
        );
    }
}

/**
 * Ping test - minimal request to verify API connectivity
 */
export async function ping(): Promise<{ ok: true; provider: string; model: string }> {
    const messages = [
        { role: 'user' as const, content: 'Return JSON only. No markdown. No explanation. Just: {"ok": true, "msg": "pong"}' }
    ];

    const response = await makeGroqRequest(messages);
    const json = extractJSON(response);

    return {
        ok: true,
        provider: 'Groq',
        model: GROQ_MODEL // Report configured model, even if fallback used internally (might be confusing but OK for now)
    };
}

/**
 * Generate next interview turn
 */
export interface NextTurnOptions {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    config?: {
        temperature?: number;
        maxTokens?: number;
    };
}

export interface RecruiterResponse {
    say: string;
    type: "question" | "followup" | "closing";
    rubric: "hr" | "tech" | "closing";
    evaluation: {
        total_score: number;
        technical_score: number;
        communication_score: number;
        problem_solving_score: number;
        experience_score: number;
        signals: string[];
    };
}

export async function nextTurn(options: NextTurnOptions): Promise<RecruiterResponse> {
    const { systemPrompt, messages: history } = options;

    // Build OpenAI-compatible messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // System prompt with strict JSON enforcement
    messages.push({
        role: 'system',
        content: systemPrompt + '\n\nIMPORTANT: Return JSON only. No markdown. No code blocks. No explanation.'
    });

    // CRITICAL: If no messages (init call), add a starter user message
    if (history.length === 0) {
        messages.push({
            role: 'user',
            content: 'Start the interview now. Ask the first question. Return JSON only in the exact format specified in the system instruction.'
        });
    } else {
        // Convert message history
        for (const msg of history) {
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        }
    }

    // Make request
    const response = await makeGroqRequest(messages);

    // Extract and validate JSON
    const json = extractJSON(response);

    // Validate schema
    if (!json.say || typeof json.say !== 'string') {
        throw new LLMClientError(
            "INVALID_MODEL_JSON",
            "Missing or invalid 'say' field",
            "AI response must include 'say' field with recruiter message",
            json
        );
    }

    if (!json.evaluation || typeof json.evaluation !== 'object') {
        throw new LLMClientError(
            "INVALID_MODEL_JSON",
            "Missing or invalid 'evaluation' field",
            "AI response must include evaluation scores",
            json
        );
    }

    return json as RecruiterResponse;
}

/**
 * Generate interview summary
 */
export interface SummaryOptions {
    summaryPrompt: string;
}

export interface InterviewSummary {
    impression: "Hire" | "Lean Hire" | "No Hire";
    scores: {
        total: number;
        technical: number;
        communication: number;
        problem_solving: number;
        experience: number;
    };
    strengths: string[];
    weaknesses: string[];
    corrected_examples?: Array<{
        original: string;
        improved: string;
    }>;
    improvement_plan: string;
}

export async function generateSummary(options: SummaryOptions): Promise<InterviewSummary> {
    const { summaryPrompt } = options;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
            role: 'system',
            content: 'You are an expert interview evaluator. Return JSON only. No markdown. No code blocks. No explanation.'
        },
        {
            role: 'user',
            content: summaryPrompt
        }
    ];

    // Make request
    const response = await makeGroqRequest(messages);

    // Extract and validate JSON
    const json = extractJSON(response);

    // Validate required fields
    if (!json.impression || !json.scores || !json.strengths || !json.weaknesses) {
        throw new LLMClientError(
            "INVALID_MODEL_JSON",
            "Missing required fields in summary",
            "Summary must include impression, scores, strengths, and weaknesses",
            json
        );
    }

    return json as InterviewSummary;
}

export interface FinalEvaluationResponse {
    recruiter_impression: 'Hire' | 'Lean Hire' | 'No Hire';
    scores: {
        overall: number;
        technical: number;
        communication: number;
        problem_solving: number;
        experience: number;
    };
    what_i_did_well: string[];
    areas_for_improvement: string[];
}

export interface FinalReportOptions {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    config?: {
        temperature?: number;
    };
}

export async function generateFinalReport(options: FinalReportOptions): Promise<FinalEvaluationResponse> {
    const { systemPrompt, messages: history, config } = options;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    messages.push({
        role: 'system',
        content: systemPrompt + '\n\nIMPORTANT: Return JSON only. No markdown. No code blocks. No explanation.'
    });

    for (const msg of history) {
        messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        });
    }

    // Force strict JSON in the last user message if not present?
    // Actually, the system prompt is enough usually.

    const response = await makeGroqRequest(messages, config?.temperature ?? 0.2);
    const json = extractJSON(response);

    // Validate structure
    if (!json.recruiter_impression || !json.scores || !json.what_i_did_well || !json.areas_for_improvement) {
        throw new LLMClientError(
            "INVALID_MODEL_JSON",
            "Missing fields in final report",
            "Report must include impression, scores, and feedback lists",
            json
        );
    }

    return json as FinalEvaluationResponse;
}
