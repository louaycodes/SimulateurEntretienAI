import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildFinalEvaluationPrompt } from '@/lib/prompts';
import { nextTurn } from '@/lib/llm/gemini';

interface FinalEvaluationResponse {
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

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const requestId = Math.random().toString(36).substring(7);
    const sessionId = params.id;
    const startTime = Date.now();

    try {
        const body = await request.json();
        const { messages } = body;

        console.log(`[Sessions] ${requestId} - Ending interview ${sessionId}`);

        // Build conversation context for final evaluation
        const conversationMessages = messages.map((msg: any) => ({
            role: msg.type === 'recruiter' ? 'assistant' as const : 'user' as const,
            content: msg.text
        }));

        // Add final evaluation prompt
        const finalPrompt = buildFinalEvaluationPrompt();
        conversationMessages.push({
            role: 'user' as const,
            content: finalPrompt
        });

        // Call LLM for final evaluation
        console.log(`[Sessions] ${requestId} - Requesting final evaluation from LLM`);
        const response = await nextTurn({
            systemPrompt: 'You are a professional recruiter providing final interview evaluation.',
            messages: conversationMessages,
            config: { temperature: 0.3 } // Lower temperature for more consistent scoring
        });

        const latency = Date.now() - startTime;
        console.log(`[Sessions] ${requestId} - LLM response received (${latency}ms)`);

        // Parse JSON response
        let finalEvaluation: FinalEvaluationResponse;
        try {
            // Clean up response (remove markdown if present)
            let cleanedResponse = response.say.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
            }

            finalEvaluation = JSON.parse(cleanedResponse);

            // Validation
            if (!finalEvaluation.recruiter_impression || !finalEvaluation.scores) {
                throw new Error('Invalid evaluation structure');
            }

            if (!Array.isArray(finalEvaluation.what_i_did_well) || finalEvaluation.what_i_did_well.length !== 3) {
                throw new Error('what_i_did_well must be array of 3 items');
            }

            if (!Array.isArray(finalEvaluation.areas_for_improvement) || finalEvaluation.areas_for_improvement.length !== 3) {
                throw new Error('areas_for_improvement must be array of 3 items');
            }

        } catch (parseError: any) {
            console.error(`[Sessions] ${requestId} - Failed to parse evaluation:`, parseError);
            console.error(`[Sessions] ${requestId} - Raw response:`, response.say);

            return NextResponse.json({
                ok: false,
                error: {
                    code: 'PARSE_ERROR',
                    message: 'Failed to parse final evaluation from LLM',
                    hint: 'LLM returned invalid JSON format',
                    requestId,
                    rawResponse: response.say.substring(0, 500)
                }
            }, { status: 500 });
        }

        // Update session in database
        const endedAt = new Date();
        await prisma.interviewSession.update({
            where: { id: sessionId },
            data: {
                status: 'ended',
                endedAt,
                recruiterImpression: finalEvaluation.recruiter_impression,
                overallScore: finalEvaluation.scores.overall,
                technicalScore: finalEvaluation.scores.technical,
                communicationScore: finalEvaluation.scores.communication,
                problemSolvingScore: finalEvaluation.scores.problem_solving,
                experienceScore: finalEvaluation.scores.experience
            }
        });

        // Save final report
        await prisma.interviewFinalReport.create({
            data: {
                sessionId,
                impression: finalEvaluation.recruiter_impression,
                overallScore: finalEvaluation.scores.overall,
                technicalScore: finalEvaluation.scores.technical,
                communicationScore: finalEvaluation.scores.communication,
                problemSolvingScore: finalEvaluation.scores.problem_solving,
                experienceScore: finalEvaluation.scores.experience,
                whatIDidWell: finalEvaluation.what_i_did_well,
                areasForImprovement: finalEvaluation.areas_for_improvement,
                rawModelOutput: response.say
            }
        });

        console.log(`[Sessions] ${requestId} - Session ${sessionId} ended successfully`);
        console.log(`[Sessions] ${requestId} - Impression: ${finalEvaluation.recruiter_impression}, Overall: ${finalEvaluation.scores.overall}`);

        return NextResponse.json({
            ok: true,
            finalReport: finalEvaluation
        });

    } catch (error: any) {
        console.error(`[Sessions] ${requestId} - End interview failed:`, error);

        // Check if DB is unavailable
        if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P2025') {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'DB_UNAVAILABLE',
                    message: 'Database is unavailable. Final report cannot be saved.',
                    hint: 'Start PostgreSQL with: docker compose up -d',
                    requestId
                }
            }, { status: 503 });
        }

        return NextResponse.json({
            ok: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Failed to end interview',
                requestId
            }
        }, { status: 500 });
    }
}
