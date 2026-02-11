// Centralized LLM Client (Server-Side Only)
// Uses Gemini REST API with proper contents[] formatting

import https from 'https';

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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Global rate limiter: enforce minimum gap between requests
let lastRequestTimestamp = 0;
const MIN_REQUEST_GAP_MS = 1500; // 1.5 seconds between requests

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract retry delay from Gemini error response (if available)
 */
function extractRetryDelay(errorData: any): number | null {
    try {
        const details = errorData?.error?.details;
        if (Array.isArray(details)) {
            for (const detail of details) {
                if (detail['@type']?.includes('RetryInfo') && detail.retryDelay) {
                    const delayStr = detail.retryDelay.replace('s', '');
                    const seconds = parseFloat(delayStr);
                    if (!isNaN(seconds)) return Math.ceil(seconds * 1000);
                }
            }
        }
    } catch { }
    return null;
}

/**
 * Single raw request to Gemini REST API (no retry)
 */
async function makeGeminiRequestOnce(
    contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    systemInstruction?: { parts: Array<{ text: string }> }
): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new LLMClientError(
            "API_KEY_MISSING",
            "GEMINI_API_KEY environment variable not set",
            "Add GEMINI_API_KEY to your .env.local file"
        );
    }

    // Ensure model has "models/" prefix
    const modelPath = GEMINI_MODEL.startsWith('models/') ? GEMINI_MODEL : `models/${GEMINI_MODEL}`;

    const requestBody = JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        }
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/${modelPath}:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
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
                console.log(`[LLM] Provider: Gemini, Model: ${GEMINI_MODEL}, Status: ${res.statusCode}, Latency: ${latency}ms`);

                // Handle HTTP errors
                if (res.statusCode !== 200) {
                    let errorData;
                    try {
                        errorData = JSON.parse(data);
                    } catch (e) {
                        errorData = { message: data };
                    }

                    // Log full error details
                    console.error(`[LLM] Gemini Error Details:`, JSON.stringify(errorData, null, 2));

                    // Map Gemini error to typed error
                    if (res.statusCode === 400) {
                        const message = errorData.error?.message || 'Invalid request';
                        reject(new LLMClientError(
                            "INVALID_ARGUMENT",
                            message,
                            "Check request format. Gemini requires contents[] array with at least one message.",
                            errorData
                        ));
                    } else if (res.statusCode === 403) {
                        reject(new LLMClientError(
                            "PERMISSION_DENIED",
                            errorData.error?.message || "Invalid API key or permission denied",
                            "Check your GEMINI_API_KEY in .env.local",
                            errorData
                        ));
                    } else if (res.statusCode === 404) {
                        reject(new LLMClientError(
                            "NOT_FOUND",
                            `Model '${GEMINI_MODEL}' not found`,
                            "Try 'gemini-1.5-flash' or 'gemini-1.5-pro'",
                            errorData
                        ));
                    } else if (res.statusCode === 429) {
                        // Attach errorData for retry delay extraction
                        const err = new LLMClientError(
                            "RESOURCE_EXHAUSTED",
                            "API quota exceeded or rate limited",
                            "Wait a moment and try again, or upgrade your plan",
                            errorData
                        );
                        reject(err);
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

                // Extract text from Gemini response
                if (!response.candidates || !Array.isArray(response.candidates) || response.candidates.length === 0) {
                    reject(new LLMClientError(
                        "JSON_PARSE_FAILED",
                        "Missing candidates array in response",
                        "API response structure is invalid",
                        response
                    ));
                    return;
                }

                const candidate = response.candidates[0];
                if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts)) {
                    reject(new LLMClientError(
                        "JSON_PARSE_FAILED",
                        "Missing content.parts in response",
                        "API response structure is invalid",
                        response
                    ));
                    return;
                }

                const text = candidate.content.parts.map((p: any) => p.text).join('');
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
 * Make a request to Gemini REST API with retry + exponential backoff for 429 errors
 */
async function makeGeminiRequest(
    contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    systemInstruction?: { parts: Array<{ text: string }> }
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

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await makeGeminiRequestOnce(contents, systemInstruction);
            return result;
        } catch (error) {
            if (error instanceof LLMClientError && error.code === 'RESOURCE_EXHAUSTED') {
                lastError = error;

                if (attempt < MAX_RETRIES) {
                    // Extract server-suggested delay or use exponential backoff
                    const serverDelay = extractRetryDelay(error.details);
                    const backoffDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                    const delay = serverDelay || backoffDelay;

                    console.warn(`[LLM] Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${Math.ceil(delay / 1000)}s...`);
                    await sleep(delay);
                    lastRequestTimestamp = Date.now();
                    continue;
                }

                console.error(`[LLM] Rate limited - all ${MAX_RETRIES} retries exhausted`);
            } else {
                // Non-retryable error, throw immediately
                throw error;
            }
        }
    }

    // All retries failed
    throw lastError || new LLMClientError(
        "RESOURCE_EXHAUSTED",
        "API quota exceeded after all retries",
        "Wait a few minutes and try again, or upgrade your plan"
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
    const contents = [
        { role: 'user' as const, parts: [{ text: 'Return STRICT JSON only: {"ok": true, "msg": "pong"}. No markdown, no explanation.' }] }
    ];

    const response = await makeGeminiRequest(contents);
    const json = extractJSON(response);

    return {
        ok: true,
        provider: 'Gemini',
        model: GEMINI_MODEL
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
    const { systemPrompt, messages } = options;

    // Build systemInstruction
    const systemInstruction = {
        parts: [{ text: systemPrompt }]
    };

    // Build contents array from messages
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // CRITICAL: If no messages (init call), add a starter user message
    if (messages.length === 0) {
        contents.push({
            role: 'user',
            parts: [{ text: 'Start the interview now. Ask the first question. Return JSON only in the exact format specified in the system instruction.' }]
        });
    } else {
        // Convert message history to Gemini format
        for (const msg of messages) {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        }
    }

    // Make request
    const response = await makeGeminiRequest(contents, systemInstruction);

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

    const contents = [
        { role: 'user' as const, parts: [{ text: summaryPrompt }] }
    ];

    // Make request
    const response = await makeGeminiRequest(contents);

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
