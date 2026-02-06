#!/usr/bin/env node

/**
 * Test script for /api/interview/next-turn endpoint
 * Usage: node scripts/test-next-turn.mjs
 */

const BASE_URL = 'http://localhost:3000';

async function testNextTurn() {
    console.log('🧪 Testing /api/interview/next-turn endpoint\n');

    const sessionId = `test-${Date.now()}`;

    // Test 1: Initialization
    console.log('Test 1: Initialization request');
    console.log('================================');

    const initPayload = {
        sessionId,
        isInit: true,
        interviewParams: {
            role: 'Backend Developer',
            level: 'mid',
            interviewType: 'Technical',
            language: 'EN',
            duration: 30
        },
        messages: []
    };

    console.log('Payload:', JSON.stringify(initPayload, null, 2));

    try {
        const response = await fetch(`${BASE_URL}/api/interview/next-turn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(initPayload)
        });

        const data = await response.json();

        console.log('\nResponse Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
        console.log('\nResponse Body:', JSON.stringify(data, null, 2));

        if (data.ok) {
            console.log('\n✅ Initialization SUCCESS');
            console.log('Recruiter said:', data.data.say.substring(0, 100) + '...');

            // Validate schema
            const requiredFields = ['say', 'type', 'rubric', 'evaluation'];
            const missingFields = requiredFields.filter(field => !data.data[field]);

            if (missingFields.length > 0) {
                console.log('⚠️  Missing fields:', missingFields);
            } else {
                console.log('✅ All required fields present');
            }

            // Test 2: Follow-up turn
            console.log('\n\nTest 2: Follow-up turn');
            console.log('================================');

            const turnPayload = {
                sessionId,
                isInit: false,
                candidateText: 'I have 5 years of experience in Node.js and Python.',
                messages: [
                    { role: 'assistant', content: data.data.say },
                    { role: 'user', content: 'I have 5 years of experience in Node.js and Python.' }
                ]
            };

            const turnResponse = await fetch(`${BASE_URL}/api/interview/next-turn`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(turnPayload)
            });

            const turnData = await turnResponse.json();

            console.log('Response Status:', turnResponse.status);
            console.log('Response Body:', JSON.stringify(turnData, null, 2));

            if (turnData.ok) {
                console.log('\n✅ Turn SUCCESS');
                console.log('Recruiter said:', turnData.data.say.substring(0, 100) + '...');
            } else {
                console.log('\n❌ Turn FAILED');
                console.log('Error:', turnData.error);
            }

        } else {
            console.log('\n❌ Initialization FAILED');
            console.log('Error:', data.error);
        }

    } catch (error) {
        console.error('\n❌ Request failed:', error.message);
        console.error('Stack:', error.stack);
    }

    // Test 3: Validation errors
    console.log('\n\nTest 3: Validation error (missing sessionId)');
    console.log('================================');

    try {
        const invalidPayload = {
            isInit: true,
            messages: []
        };

        const response = await fetch(`${BASE_URL}/api/interview/next-turn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invalidPayload)
        });

        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));

        if (!data.ok && data.error.code === 'VALIDATION_ERROR') {
            console.log('\n✅ Validation error handled correctly');
        } else {
            console.log('\n⚠️  Unexpected response for invalid payload');
        }

    } catch (error) {
        console.error('\n❌ Request failed:', error.message);
    }

    console.log('\n\n🏁 Tests complete');
}

// Run tests
testNextTurn().catch(console.error);
