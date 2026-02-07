// Centralized LLM Client (Server-Side Only)
// Supports Gemini Interactions API with proper error handling

import https from 'https';

// Error codes for typed error handling
export type LLMErrorCode =
    | "API_KEY_MISSING"
    | "UNAUTHORIZED"
    | "MODEL_NOT_FOUND"
    | "QUOTA_EXCEEDED"
    | "NETWORK_ERROR"
    | "JSON_PARSE_FAILED"
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
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const GEMINI_ENDPOINT = 'generativelanguage.googleapis.com';

/**
 * Make a request to Gemini Interactions API
 */
async function makeGeminiRequest(input: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new LLMClientError(
            "API_KEY_MISSING",
            "GEMINI_API_KEY environment variable not set",
            "Add GEMINI_API_KEY to your .env.local file"
        );
    }

    const requestBody = JSON.stringify({
        model: GEMINI_MODEL,
        input
    });

    const options = {
        hostname: GEMINI_ENDPOINT,
        path: '/v1beta/interactions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
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

                    if (res.statusCode === 401 || res.statusCode === 403) {
                        reject(new LLMClientError(
                            "UNAUTHORIZED",
                            "Invalid API key",
                            "Check your GEMINI_API_KEY in .env.local",
                            errorData
                        ));
                    } else if (res.statusCode === 404) {
                        reject(new LLMClientError(
                            "MODEL_NOT_FOUND",
                            `Model '${GEMINI_MODEL}' not found`,
                            "Try 'gemini-3-flash-preview' or check available models",
                            errorData
                        ));
                    } else if (res.statusCode === 429) {
                        reject(new LLMClientError(
                            "QUOTA_EXCEEDED",
                            "API quota exceeded or rate limited",
                            "Wait a moment and try again, or upgrade your plan",
                            errorData
                        ));
                    } else {
                        reject(new LLMClientError(
                            "UNKNOWN_ERROR",
                            `HTTP ${res.statusCode}: ${res.statusMessage}`,
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

                // Extract text from response
                if (!response.outputs || !Array.isArray(response.outputs)) {
                    reject(new LLMClientError(
                        "JSON_PARSE_FAILED",
                        "Missing outputs array in response",
                        "API response structure is invalid",
                        response
                    ));
                    return;
                }

                const lastOutput = response.outputs[response.outputs.length - 1];
                if (!lastOutput || !lastOutput.text) {
                    reject(new LLMClientError(
                        "JSON_PARSE_FAILED",
                        "Missing text in output",
                        "API response structure is invalid",
                        response
                    ));
                    return;
                }

                resolve(lastOutput.text);
            });
        });

        req.on('error', (error: any) => {
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                reject(new LLMClientError(
                    "NETWORK_ERROR",
                    "Cannot reach Gemini API",
                    "Check your internet connection and firewall settings",
                    error
                ));
            } else {
                reject(new LLMClientError(
                    "NETWORK_ERROR",
                    error.message,
                    "Network error occurred",
                    error
                ));
            }
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Extract JSON from AI response text
 */
function extractJSON(text: string): any {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new LLMClientError(
            "JSON_PARSE_FAILED",
            "No JSON found in AI response",
            "AI did not return JSON format. Try adjusting the prompt.",
            { rawText: text }
        );
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        throw new LLMClientError(
            "JSON_PARSE_FAILED",
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
    const response = await makeGeminiRequest(
        'Return STRICT JSON only: {"ok": true, "msg": "pong"}. No markdown, no explanation.'
    );

    // Try to extract JSON
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
        signals: string[];
    };
}

export async function nextTurn(options: NextTurnOptions): Promise<RecruiterResponse> {
    const { systemPrompt, messages } = options;

    // Build full prompt
    let fullPrompt = systemPrompt + "\n\n";

    // Add conversation history
    for (const msg of messages) {
        if (msg.role === "user") {
            fullPrompt += `Candidate: ${msg.content}\n\n`;
        } else if (msg.role === "assistant") {
            fullPrompt += `Recruiter: ${msg.content}\n\n`;
        }
    }

    fullPrompt += `
Now, as the recruiter, provide your next response in the required STRICT JSON format.
Structure your JSON EXACTLY like this:
{
  "say": "Here write the text that you will speak to the candidate.",
  "type": "question", 
  "rubric": "hr",
  "evaluation": {
    "total_score": 0,
    "technical_score": 0,
    "communication_score": 0,
    "problem_solving_score": 0,
    "signals": []
  }
}

Return ONLY the JSON object, no markdown code blocks, no explanations.`;

    // Make request
    const response = await makeGeminiRequest(fullPrompt);

    // Extract and validate JSON
    const json = extractJSON(response);

    // Validate schema
    if (!json.say || typeof json.say !== 'string') {
        throw new LLMClientError(
            "JSON_PARSE_FAILED",
            "Missing or invalid 'say' field",
            "AI response doesn't match expected schema",
            json
        );
    }

    if (!json.evaluation || typeof json.evaluation !== 'object') {
        throw new LLMClientError(
            "JSON_PARSE_FAILED",
            "Missing or invalid 'evaluation' field",
            "AI response doesn't match expected schema",
            json
        );
    }

    // Validate scores
    const requiredScores = ['total_score', 'technical_score', 'communication_score', 'problem_solving_score'];
    for (const score of requiredScores) {
        if (typeof json.evaluation[score] !== 'number') {
            throw new LLMClientError(
                "JSON_PARSE_FAILED",
                `Missing or invalid '${score}' in evaluation`,
                "AI response doesn't match expected schema",
                json
            );
        }
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

    const fullPrompt = summaryPrompt + "\n\nReturn ONLY the JSON object, no markdown code blocks, no explanations:";

    // Make request
    const response = await makeGeminiRequest(fullPrompt);

    // Extract and validate JSON
    const json = extractJSON(response);

    // Basic validation
    if (!json.impression || !json.scores || !json.strengths || !json.weaknesses || !json.improvement_plan) {
        throw new LLMClientError(
            "JSON_PARSE_FAILED",
            "Summary response missing required fields",
            "AI response doesn't match expected schema",
            json
        );
    }

    return json as InterviewSummary;
}

/**
 * Generate next interview turn with STREAMING
 * Returns a ReadableStream of text chunks
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function* nextTurnStream(options: NextTurnOptions): AsyncGenerator<string, void, unknown> {
    const { systemPrompt, messages, config } = options;

    if (!GEMINI_API_KEY) {
        throw new LLMClientError(
            "API_KEY_MISSING",
            "GEMINI_API_KEY environment variable not set",
            "Add GEMINI_API_KEY to your .env.local file"
        );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // Build full prompt
    let fullPrompt = systemPrompt + "\n\n";

    // Add conversation history
    for (const msg of messages) {
        if (msg.role === "user") {
            fullPrompt += `Candidate: ${msg.content}\n\n`;
        } else if (msg.role === "assistant") {
            fullPrompt += `Recruiter: ${msg.content}\n\n`;
        }
    }

    // CRITICAL: We need the 'say' field to be first for streaming to work well on client.
    fullPrompt += `
Now, as the recruiter, provide your next response in the required STRICT JSON format. 
IMPORTANT: The JSON object MUST start with the "say" field.
Structure your JSON EXACTLY like this:
{
  "say": "Here write the text that you will speak to the candidate.",
  "type": "question", 
  "rubric": "hr",
  "evaluation": {
    "total_score": 0,
    "technical_score": 0,
    "communication_score": 0,
    "problem_solving_score": 0,
    "signals": [] 
  }
}

Return ONLY the JSON object, no markdown code blocks, no explanations.
`;

    try {
        const result = await model.generateContentStream(fullPrompt);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            yield chunkText;
        }
    } catch (error: any) {
        console.error("Gemini Streaming Error:", error);
        throw new LLMClientError(
            "UNKNOWN_ERROR",
            error.message || "Streaming failed",
            "Check server logs",
            error
        );
    }
}
