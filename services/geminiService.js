// services/geminiService.js
const config = require('../config');
const logger = require('../utils/logger');

async function extractMetadataAndInfo(courseText) {
  const { modelName, generationConfig } = config.gemini;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;
  const prompt = `
    Analyze the following course information and extract the specified details.
    Return the output as a single, minified, valid JSON object with no other text before or after it.
    The JSON object must have these exact keys: "courseName", "universityName", "country", "summary".

    - "courseName": The official name of the course.
    - "universityName": The name of the university offering the course.
    - "country": The country where the university is located.
    - "summary": A concise, 10-line summary covering the course focus, key modules, skills gained, and potential career paths.

    Course Information:
    ---
    ${courseText.substring(0, 30000)}
    ---
  `;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorBody}`);
    }

    const raw = await response.json();
    const rawText = raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedJsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedJsonString);
    return {
      course: data.courseName || 'Unknown Course',
      university: data.universityName || 'Unknown University',
      country: data.country || 'Unknown Country',
      courseInfo: data.summary || 'Info not available.',
    };
  } catch (error) {
    logger.error("Failed to extract metadata from Gemini.", error);
    throw error;
  }
}

module.exports = { extractMetadataAndInfo };