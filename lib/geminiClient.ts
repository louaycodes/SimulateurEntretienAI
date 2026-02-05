// Frontend Gemini Client (Browser-Side)
// Calls server-side API routes - never exposes API key

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

export interface GenerateOptions {
    systemPrompt: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    config?: any;
    onToken?: (token: string) => void;
}

export class GeminiClient {
    /**
     * Test API connectivity
     */
    async testConnection(): Promise<{ ok: boolean; provider?: string; model?: string; error?: string }> {
        try {
            const response = await fetch('/api/llm/ping');
            const data = await response.json();

            if (data.ok) {
                return {
                    ok: true,
                    provider: data.provider,
                    model: data.model
                };
            } else {
                return {
                    ok: false,
                    error: data.error?.message || 'Connection failed'
                };
            }
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * Generate next interview turn
     */
    async generate(options: GenerateOptions): Promise<string> {
        const { systemPrompt, messages, config, onToken } = options;

        try {
            const response = await fetch('/api/interview/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    systemPrompt,
                    messages,
                    config
                }),
            });

            const result = await response.json();

            if (!result.ok) {
                // Structured error from server
                const error = result.error;
                throw new Error(`${error.message}\n\nHint: ${error.hint}`);
            }

            // Extract the response
            const data = result.data as RecruiterResponse;
            const fullText = JSON.stringify(data);

            // Simulate streaming for UX (optional)
            if (onToken) {
                const words = data.say.split(' ');
                for (const word of words) {
                    onToken(word + ' ');
                    await new Promise(resolve => setTimeout(resolve, 30));
                }
            }

            return fullText;

        } catch (error) {
            console.error('Generate error:', error);
            throw error;
        }
    }

    /**
     * Parse recruiter response from JSON string
     */
    async parseRecruiterResponse(rawResponse: string): Promise<RecruiterResponse> {
        try {
            // Try to parse as JSON
            const json = JSON.parse(rawResponse);

            // Validate required fields
            if (!json.say || !json.evaluation) {
                throw new Error('Invalid response structure');
            }

            return json as RecruiterResponse;
        } catch (error) {
            console.error('Parse error:', error);

            // Return fallback response
            return {
                say: "I apologize, there was an error processing the response. Let's continue with the next question.",
                type: "question",
                rubric: "hr",
                evaluation: {
                    total_score: 50,
                    technical_score: 50,
                    communication_score: 50,
                    problem_solving_score: 50,
                    signals: ["error_occurred"]
                }
            };
        }
    }

    /**
     * Generate interview summary
     */
    async generateSummary(transcript: any[], privateNotes: any[], summaryPrompt: string): Promise<InterviewSummary> {
        try {
            const response = await fetch('/api/interview/summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    summaryPrompt,
                    transcript,
                    privateNotes
                }),
            });

            const result = await response.json();

            if (!result.ok) {
                const error = result.error;
                throw new Error(`${error.message}\n\nHint: ${error.hint}`);
            }

            return result.data as InterviewSummary;

        } catch (error) {
            console.error('Summary generation error:', error);

            // Return fallback summary
            return {
                impression: "Lean Hire",
                scores: {
                    total: 70,
                    technical: 70,
                    communication: 70,
                    problem_solving: 70
                },
                strengths: [
                    "Participated in the interview",
                    "Showed interest in the position"
                ],
                weaknesses: [
                    "Could provide more detailed examples",
                    "Some answers lacked depth"
                ],
                improvement_plan: "Focus on providing specific examples and explaining technical concepts clearly."
            };
        }
    }
}
