import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const requestId = Math.random().toString(36).substring(7);
    const sessionId = params.id;

    try {
        const body = await request.json();
        const { role, text, timestampMs, elapsedSec, recruiterMsgId } = body;

        // Validation
        if (!role || !text || timestampMs === undefined) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields (role, text, timestampMs)',
                    requestId
                }
            }, { status: 400 });
        }

        // Save message to database
        await prisma.interviewMessage.create({
            data: {
                sessionId,
                role,
                text,
                timestampMs: BigInt(timestampMs),
                elapsedSec: elapsedSec || 0,
                recruiterMsgId
            }
        });

        return NextResponse.json({ ok: true });

    } catch (error: any) {
        console.error(`[Sessions] Save message failed (${requestId}):`, error);

        // Graceful degradation - don't crash the interview
        if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P2025') {
            console.warn(`[Sessions] DB unavailable or session not found - message not saved`);
            return NextResponse.json({ ok: true }); // Return success to not block UI
        }

        return NextResponse.json({
            ok: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Failed to save message',
                requestId
            }
        }, { status: 500 });
    }
}
