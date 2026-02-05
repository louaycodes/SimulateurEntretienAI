// API Ping Route - Test LLM connectivity
// GET /api/llm/ping

import { NextResponse } from "next/server";
import { ping, LLMClientError } from "@/lib/llmClient";

export async function GET() {
    const startTime = Date.now();

    try {
        const result = await ping();
        const latency = Date.now() - startTime;

        return NextResponse.json({
            ok: true,
            provider: result.provider,
            model: result.model,
            latency
        });
    } catch (error) {
        const latency = Date.now() - startTime;

        if (error instanceof LLMClientError) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: error.code,
                    message: error.message,
                    hint: error.hint
                },
                latency
            }, { status: 500 });
        }

        // Unknown error
        return NextResponse.json({
            ok: false,
            error: {
                code: "UNKNOWN_ERROR",
                message: error instanceof Error ? error.message : "Unknown error occurred",
                hint: "Check server logs for details"
            },
            latency
        }, { status: 500 });
    }
}
