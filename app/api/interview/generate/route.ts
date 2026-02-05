// Server-side API route for interview question generation
// Uses centralized LLM client with proper error handling

import { NextRequest, NextResponse } from "next/server";
import { nextTurn, LLMClientError } from "@/lib/llmClient";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { systemPrompt, messages, config } = body;

        if (!systemPrompt || !messages) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: "INVALID_REQUEST",
                    message: "Missing required fields: systemPrompt and messages",
                    hint: "Check your request body"
                }
            }, { status: 400 });
        }

        // Call centralized LLM client
        const response = await nextTurn({
            systemPrompt,
            messages,
            config
        });

        // Return the full response (client will handle streaming display)
        return NextResponse.json({
            ok: true,
            data: response
        });

    } catch (error) {
        console.error("Interview generation error:", error);

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
