#!/usr/bin/env node

/**
 * LLM API Test Script
 * Tests Gemini Interactions API connectivity before app integration
 * 
 * Usage:
 *   GEMINI_API_KEY=your_key node scripts/test-llm.mjs
 */

import https from 'https';

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
const GEMINI_ENDPOINT = 'generativelanguage.googleapis.com';

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

async function testGeminiAPI() {
    log(colors.cyan, '\n🧪 Testing Gemini Interactions API...\n');

    // Check API key
    if (!GEMINI_API_KEY) {
        log(colors.red, '❌ FAIL - API key missing');
        log(colors.yellow, 'Hint: Set GEMINI_API_KEY environment variable');
        log(colors.yellow, 'Example: GEMINI_API_KEY=your_key node scripts/test-llm.mjs');
        process.exit(1);
    }

    // Display configuration
    log(colors.blue, 'Provider:', 'Gemini Interactions API');
    log(colors.blue, 'Model:', GEMINI_MODEL);
    log(colors.blue, 'Endpoint:', `https://${GEMINI_ENDPOINT}/v1beta/interactions`);
    console.log('');

    const startTime = Date.now();

    // Prepare request
    const requestBody = JSON.stringify({
        model: GEMINI_MODEL,
        input: 'Return STRICT JSON only: {"ok": true, "msg": "pong"}. No markdown, no explanation, just the JSON.'
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
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const latency = ((Date.now() - startTime) / 1000).toFixed(2);

                // Check HTTP status
                if (res.statusCode !== 200) {
                    log(colors.red, `❌ FAIL - HTTP ${res.statusCode} ${res.statusMessage}`);
                    log(colors.yellow, '\nResponse:');
                    console.log(data);

                    // Provide specific hints
                    if (res.statusCode === 401 || res.statusCode === 403) {
                        log(colors.yellow, '\nHint: Invalid API key. Check your GEMINI_API_KEY');
                    } else if (res.statusCode === 404) {
                        log(colors.yellow, '\nHint: Model not found. Try a different model name');
                        log(colors.yellow, 'Available models: gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-pro');
                    } else if (res.statusCode === 429) {
                        log(colors.yellow, '\nHint: Rate limit exceeded. Wait a moment and try again');
                    }

                    process.exit(1);
                }

                // Parse JSON response
                let response;
                try {
                    response = JSON.parse(data);
                } catch (error) {
                    log(colors.red, '❌ FAIL - Invalid JSON response');
                    log(colors.yellow, '\nRaw response:');
                    console.log(data);
                    log(colors.yellow, '\nHint: API returned non-JSON data');
                    process.exit(1);
                }

                // Validate response structure
                if (!response.outputs || !Array.isArray(response.outputs)) {
                    log(colors.red, '❌ FAIL - Missing outputs array');
                    log(colors.yellow, '\nResponse:');
                    console.log(JSON.stringify(response, null, 2));
                    process.exit(1);
                }

                const lastOutput = response.outputs[response.outputs.length - 1];
                if (!lastOutput || !lastOutput.text) {
                    log(colors.red, '❌ FAIL - Missing text in output');
                    log(colors.yellow, '\nResponse:');
                    console.log(JSON.stringify(response, null, 2));
                    process.exit(1);
                }

                // Extract and validate JSON from AI response
                const aiText = lastOutput.text;
                let aiJson;
                try {
                    // Try to extract JSON from the response
                    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) {
                        throw new Error('No JSON found in AI response');
                    }
                    aiJson = JSON.parse(jsonMatch[0]);
                } catch (error) {
                    log(colors.yellow, '⚠️  WARNING - AI did not return valid JSON');
                    log(colors.yellow, '\nAI Response:');
                    console.log(aiText);
                    log(colors.yellow, '\nNote: API works but AI needs better prompting for strict JSON');
                }

                // Success!
                log(colors.green, `✅ PASS - API is working!`);
                log(colors.blue, `Response time: ${latency}s`);

                if (aiJson) {
                    log(colors.blue, 'AI Response:');
                    console.log(JSON.stringify(aiJson, null, 2));
                }

                log(colors.green, '\n✨ You can now run the app with confidence!');
                log(colors.cyan, 'Next step: npm run dev');

                resolve();
            });
        });

        req.on('error', (error) => {
            log(colors.red, '❌ FAIL - Network error');
            log(colors.yellow, '\nError:', error.message);

            if (error.code === 'ENOTFOUND') {
                log(colors.yellow, 'Hint: Cannot reach API endpoint. Check internet connection');
            } else if (error.code === 'ECONNREFUSED') {
                log(colors.yellow, 'Hint: Connection refused. Check firewall settings');
            } else {
                log(colors.yellow, 'Hint: Network issue. Check internet connection and firewall');
            }

            process.exit(1);
        });

        req.write(requestBody);
        req.end();
    });
}

// Run test
testGeminiAPI().catch((error) => {
    log(colors.red, '❌ FAIL - Unexpected error');
    console.error(error);
    process.exit(1);
});
