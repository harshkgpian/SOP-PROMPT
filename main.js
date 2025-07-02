/**
 * SOP Prompt Generator using Google Gemini API - Advanced Control Version
 * -----------------------------------------------------------------------
 * This script allows direct control over the generative model's parameters.
 * It requires no external packages and uses built-in features.
 *
 * REQUIREMENTS:
 * 1. Node.js version 18 or higher.
 * 2. A Google Gemini API Key.
 * 3. 'pdf-parse' npm package installed. (npm install pdf-parse)
 *
 * HOW TO SET API KEY:
 * Set your API key as an environment variable in your terminal before running.
 * - (macOS/Linux): export GEMINI_API_KEY="YOUR_API_KEY"
 * - (Windows CMD): set GEMINI_API_KEY="YOUR_API_KEY"
 * - (PowerShell):  $env:GEMINI_API_KEY="YOUR_API_KEY"
 *
 * HOW TO RUN WITH CONTROLS:
 * node sop_generator.js [options] "<URL_or_course_text>"
 *
 * AVAILABLE OPTIONS:
 * --model <name>         : Set the model to use (default: "gemini-2.5-flash-lite-preview-06-17").
 * --temperature <0.0-1.0>: Set the creativity/randomness (default: 0.4).
 * --maxTokens <number>   : Set the max length of the response (default: 2048).
 * --topK <number>        : Set the Top-K sampling value (default: 1).
 * --topP <number>        : Set the Top-P sampling value (default: 1).
 * --resume <filename>    : Specify a resume file from the 'resume' folder (e.g., --resume my_resume). Expects my_resume.pdf in the resume folder.
 * --output <filename>    : Specify a custom output filename (e.g., --output custom_sop.txt). If not provided, a name based on course/university will be used.
 * --help                 : Show this help message.
 */

// --- CONFIGURATION & VALIDATION ---
// If you don't have dotenv installed, you can comment out this line
// and ensure GEMINI_API_KEY is set directly in your environment.
// To install: npm install dotenv
// You MUST also install pdf-parse: npm install pdf-parse
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const fs = require('fs'); // Required for file system operations
const path = require('path'); // Required for path manipulation
const pdf = require('pdf-parse'); // Required for PDF parsing

if (!GEMINI_API_KEY) {
  console.error(
    "ERROR: GEMINI_API_KEY environment variable not set.\n" +
    "Please set it before running the script.\n" +
    'Example (macOS/Linux): export GEMINI_API_KEY="YOUR_KEY"'
  );
  process.exit(1);
}

// --- ARGUMENT PARSING & HELPERS ---

function parseArguments() {
  const args = process.argv.slice(2);
  const config = {
    modelName: 'gemini-2.5-flash-lite-preview-06-17',
    generationConfig: {
      temperature: 0.4,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    },
    input: '',
    resumeFileName: null, // New field for resume filename
    outputFileName: null, // New field for custom output filename
  };

  if (args.includes('--help')) {
    console.log(
`SOP Prompt Generator Help:
Usage: node sop_generator.js [options] "<URL_or_course_text>"

Options:
  --model <name>          Model to use (default: "gemini-2.5-flash-lite-preview-06-17").
  --temperature <0.0-1.0> Controls randomness (default: 0.4).
  --maxTokens <number>    Max response length (default: 2048).
  --topK <number>         Top-K sampling value (default: 1).
  --topP <number>         Top-P sampling value (default: 1).
  --resume <filename>     Specify a resume file from the 'resume' folder (e.g., --resume my_resume). Expects my_resume.pdf in the resume folder.
  --output <filename>     Specify a custom output filename (e.g., --output custom_sop.txt). If not provided, a name based on course/university will be used.
  --help                  Show this help message.`
    );
    process.exit(0);
  }

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case '--model':
        config.modelName = args[++i];
        break;
      case '--temperature':
        config.generationConfig.temperature = parseFloat(args[++i]);
        break;
      case '--maxTokens':
        config.generationConfig.maxOutputTokens = parseInt(args[++i], 10);
        break;
      case '--topK':
        config.generationConfig.topK = parseInt(args[++i], 10);
        break;
      case '--topP':
        config.generationConfig.topP = parseFloat(args[++i]);
        break;
      case '--resume': // Handle the new resume argument
        config.resumeFileName = args[++i]; // Store only the base name, we'll add .pdf later
        break;
      case '--output': // Handle custom output filename
        config.outputFileName = args[++i];
        break;
      default:
        if (!arg.startsWith('--')) {
          config.input = arg;
        }
    }
    i++;
  }

  return config;
}

/**
 * Sanitizes a string to be used as a filename.
 * Replaces spaces with underscores and removes characters not allowed in filenames.
 * @param {string} name The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeFileName(name) {
    if (!name) return 'untitled';
    // Replace spaces with underscores and remove invalid filename characters
    return name
        .replace(/\s+/g, '_') // Replace one or more spaces with a single underscore
        .replace(/[<>:"/\\|?*]+/g, '') // Remove invalid filename characters
        .toLowerCase(); // Convert to lowercase for consistency
}


async function readResumeContent(filename) {
    if (!filename) return null; // No resume provided

    const pdfPath = path.join(__dirname, 'resume', `${filename}.pdf`);

    try {
        // Check if the file exists
        if (!fs.existsSync(pdfPath)) {
            console.error(`Error: Resume file not found at ${pdfPath}`);
            return null;
        }

        // Read the PDF file as a buffer
        const dataBuffer = fs.readFileSync(pdfPath);

        // Parse the PDF buffer
        const data = await pdf(dataBuffer);

        // data.text contains the extracted text
        return data.text;
    } catch (error) {
        console.error(`Error extracting text from resume PDF (${pdfPath}):`, error);
        return null;
    }
}


async function fetchCourseTextFromUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
    const html = await res.text();
    // Simple HTML cleaning: remove tags, replace multiple spaces/newlines with single ones
    const cleanedText = html.replace(/<[^>]+>/g, ' ').replace(/\s\s+/g, ' ').trim();
    return cleanedText;
  } catch (error) {
    console.error(`Error fetching from URL ${url}:`, error.message);
    throw error;
  }
}

async function extractMetadataAndInfo(courseText, modelName, generationConfig) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `
Analyze the following course information and extract the specified details.
Return the output as a single, minified, valid JSON object with no other text before or after it.

The JSON object must have these exact keys: "courseName", "universityName", "country", "summary".

- "courseName": The official name of the course.
- "universityName": The name of the university offering the course.
- "country": The country where the university is located.
- "summary": Detailed information about the course/university from the provided text.

Course Information:
---
${courseText.substring(0, 30000)}
---
`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: generationConfig, // Pass the user-defined config here
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const raw = await response.json();
  const rawText = raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const cleanedJsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedJsonString);
    return {
      course: data.courseName || 'Unknown Course',
      university: data.universityName || 'Unknown University',
      country: data.country || 'Unknown Country',
      courseInfo: data.summary || 'Info not available.',
    };
  } catch (error) {
    console.error("Failed to parse JSON from Gemini's response. Raw response was:", rawText);
    return {
      course: 'Unknown Course',
      university: 'Unknown University',
      country: 'Unknown Country',
      courseInfo: 'Could not automatically extract course info from the provided text.',
    };
  }
}

// --- MODIFIED buildSOPPrompt TO INCLUDE USER RESUME ---
function buildSOPPrompt(course, university, country, courseSummary, userResumeContent) {
  let resumeSection = '';
  if (userResumeContent) {
    resumeSection = `
--- My Resume Information ---
${userResumeContent}
-----------------------------

Now, using the above course details and my resume information, please generate a Statement of Purpose. Follow the structure below:
`;
  } else {
    resumeSection = `
Please take all the required details from the attached profile. It should be able to properly justify my course selection and align it with my past. Structure the SOP as per below:
`;
  }

  return `
I am applying to the Master's in ${course} at ${university} in ${country}.

${resumeSection}
1st Paragraph – Introduction: Write about how the ${course} industry is growing and from where I gained initial interest. Complete the paragraph by setting the context of why I want to apply for this course at this university.

2nd Paragraph – Academic Journey: Explain my academic journey starting from the 10th. Go in chronological order and explain the transitions. In case of work experience, also connect that with my past and explain why I think this is the right time to resume my academic journey. End the paragraph with “hence I decided to pursue further education.”

3rd Paragraph – Why this Course: Explain why this course is good for me. Align it with my past education and experience.

4th Paragraph – Why this University: Explain why ${university}. Align it with the course that I have selected.

5th Paragraph – Why this Country: Explain why ${country}. Justify it in the context of this course.

6th Paragraph – Future Plans: Explain my plans after the completion of this course.

7th Paragraph – Conclusion: Wrap up the SOP with a convincing statement and gratitude.

Here is the course information:\n${courseSummary}
`;
}

// --- MAIN RUNNER ---
(async () => {
  try {
    const { input, modelName, generationConfig, resumeFileName, outputFileName } = parseArguments();

    if (!input) {
      console.error('No input URL or text provided. Use --help for usage information.');
      process.exit(1);
    }

    console.log('--- Configuration ---');
    console.log(`- Model: ${modelName}`);
    console.log(`- Temperature: ${generationConfig.temperature}`);
    console.log(`- Max Tokens: ${generationConfig.maxOutputTokens}`);
    if (resumeFileName) {
        console.log(`- Resume File: ${resumeFileName}.pdf`);
    }
    console.log('---------------------\n');

    let courseText = '';
    if (input.startsWith('http')) {
      console.log(`- Fetching course content from URL: ${input}`);
      courseText = await fetchCourseTextFromUrl(input);
    } else {
      console.log('- Using provided text as course content.');
      courseText = input;
    }

    console.log('- Extracting course and university metadata with Gemini...');
    const { course, university, country, courseInfo } = await extractMetadataAndInfo(
      courseText,
      modelName,
      generationConfig
    );

    console.log('\n✅ Course/University Info Extracted:\n');
    console.log(`  Course: ${course}`);
    console.log(`  University: ${university}`);
    console.log(`  Country: ${country}\n`);
    console.log('--- Summary ---');
    console.log(courseInfo);
    console.log('----------------\n');

    // Await the promise returned by readResumeContent
    const userResumeContent = await readResumeContent(resumeFileName);
    if (resumeFileName && !userResumeContent) {
        // Exit if a resume was specified but couldn't be read
        console.error("Exiting due to issues reading the specified resume file.");
        process.exit(1);
    }

    // Now, userResumeContent will contain the actual text or null
    const sopPrompt = buildSOPPrompt(course, university, country, courseInfo, userResumeContent);

    console.log('\n📝 Generated SOP Prompt (Ready to be used with your profile):\n');
    console.log(sopPrompt);

    // --- SAVING THE PROMPT TO A FILE ---
    const promptsDir = path.join(__dirname, 'prompts');
    if (!fs.existsSync(promptsDir)) {
        fs.mkdirSync(promptsDir);
        console.log(`Created directory: ${promptsDir}`);
    }

    let finalOutputFileName;
    if (outputFileName) {
        finalOutputFileName = outputFileName;
        // Ensure it ends with .txt if it doesn't already
        if (!finalOutputFileName.toLowerCase().endsWith('.txt')) {
            finalOutputFileName += '.txt';
        }
    } else {
        // Create a filename based on course and university names
        const sanitizedCourseName = sanitizeFileName(course);
        const sanitizedUniversityName = sanitizeFileName(university);
        finalOutputFileName = `${sanitizedCourseName}_${sanitizedUniversityName}_prompt.txt`;
    }

    const filePath = path.join(promptsDir, finalOutputFileName);

    fs.writeFileSync(filePath, sopPrompt, 'utf8');
    console.log(`\n✅ SOP Prompt successfully saved to: ${filePath}`);

  } catch (error) {
    console.error('\n❌ An error occurred during the process:', error.message);
    process.exit(1);
  }
})();