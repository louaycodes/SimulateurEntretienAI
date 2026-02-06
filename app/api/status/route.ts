
import { NextResponse } from "next/server";
import { ping, LLMClientError } from "@/lib/llmClient";

export async function GET() {
    try {
        const result = await ping();
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof LLMClientError) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: error.code,
                    message: error.message,
                    hint: error.hint
                }
            }, { status: error.code === 'API_KEY_MISSING' || error.code === 'UNAUTHORIZED' ? 401 : 500 });
        }

        return NextResponse.json({
            ok: false,
            error: {
                code: "UNKNOWN_ERROR",
                message: error instanceof Error ? error.message : "Unknown error",
            }
        }, { status: 500 });
    }
}
