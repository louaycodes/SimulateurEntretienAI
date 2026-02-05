// Server-side API route for final interview summary generation
// Uses centralized LLM client

import { NextRequest, NextResponse } from "next/server";
import { generateSummary, LLMClientError } from "@/lib/llmClient";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { summaryPrompt } = body;

        if (!summaryPrompt) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: "INVALID_REQUEST",
                    message: "Missing summaryPrompt",
                    hint: "Check your request body"
                }
            }, { status: 400 });
        }

        // Generate summary using centralized client
        const summary = await generateSummary({ summaryPrompt });

        return NextResponse.json({
            ok: true,
            data: summary
        });

    } catch (error) {
        console.error("Summary generation error:", error);

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
