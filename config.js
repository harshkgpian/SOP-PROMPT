// config.js
require('dotenv').config();
const path = require('path');

// Basic validation
if (!process.env.GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY environment variable not set.");
  process.exit(1);
}

module.exports = {
  apiKey: process.env.GEMINI_API_KEY,

  // File and folder paths
  paths: {
    data: path.join(__dirname, 'data'),
    csvFile: path.join(__dirname, 'data', 'applications.csv'),
    prompts: path.join(__dirname, 'prompts'),
    resumes: path.join(__dirname, 'resume'),
  },

  // Gemini model and generation settings
  gemini: {
    modelName: 'gemini-2.5-flash-lite-preview-06-17',
    generationConfig: {
      temperature: 0.4,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    },
  },

  // CSV column headers
  csvHeaders: [
    { id: 'candidateName', title: 'candidateName' },
    { id: 'resumeFile', title: 'resumeFile' },
    { id: 'courseInput', title: 'courseInput' },
    { id: 'courseName', title: 'courseName' },
    { id: 'universityName', title: 'universityName' },
    { id: 'promptPath', title: 'promptPath' },
    // NOTE: The 'prompt' itself is too large for a clean CSV.
    // We will store the path and generate the prompt on demand.
  ],
};