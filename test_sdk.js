
const { GoogleGenerativeAI } = require("@google/generative-ai");
const https = require('https');

// Simple environment check
const API_KEY = process.env.GEMINI_API_KEY; // I'll inject this when running

async function testStream() {
    console.log("Starting SDK Stream Test...");
    if (!API_KEY) {
        console.error("No API KEY");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        console.log("Model initialized. Generating stream...");
        const result = await model.generateContentStream("Say only 'Hello world'");

        console.log("Stream request sent. Iterating...");
        for await (const chunk of result.stream) {
            console.log("Chunk:", chunk.text());
        }
        console.log("Stream finished.");
    } catch (e) {
        console.error("SDK Error:", e);
    }
}

testStream();
