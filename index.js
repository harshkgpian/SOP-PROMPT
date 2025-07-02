// index.js
const logger = require('./utils/logger');
const fileUtils = require('./utils/fileUtils');
const csvService = require('./services/csvService');
const geminiService = require('./services/geminiService');
const promptService = require('./services/promptService');

async function processApplication(app) {
  logger.info(`Processing application for: ${app.candidateName}`);

  // 1. Get Course Text
  const isUrl = app.courseInput.startsWith('http');
  const courseText = isUrl
    ? await fileUtils.fetchCourseTextFromUrl(app.courseInput)
    : app.courseInput;

  if (!courseText) {
    throw new Error('Could not retrieve course text.');
  }

  // 2. Extract Metadata from Gemini
  const metadata = await geminiService.extractMetadataAndInfo(courseText);

  // 3. Read Resume
  const resumeContent = await fileUtils.readResumeContent(app.resumeFile);
  if (app.resumeFile && !resumeContent) {
    logger.warn(`Could not read resume for ${app.candidateName}, proceeding without it.`);
  }

  // 4. Build the SOP Prompt
  const sopPrompt = promptService.buildSOPPrompt(metadata, resumeContent);

  // 5. Save the prompt to a file
  const sanitizedCourse = fileUtils.sanitizeFileName(metadata.course);
  const sanitizedUni = fileUtils.sanitizeFileName(metadata.university);
  const fileName = `${sanitizedCourse}_${sanitizedUni}_prompt.txt`;
  const savedPath = fileUtils.savePromptToFile(sopPrompt, fileName);
  logger.success(`Prompt saved to: ${savedPath}`);

  // 6. Return data to update the CSV
  return {
    courseName: metadata.course,
    universityName: metadata.university,
    promptPath: savedPath,
  };
}


async function main() {
  logger.info('--- Starting SOP Prompt Generation Process ---');
  let applications = await csvService.readApplications();

  if (applications.length === 0) {
    logger.warn('The applications.csv file is empty. Please add applications to process.');
    logger.info('CSV format: candidateName,resumeFile,courseInput');
    return;
  }

  let processedCount = 0;
  for (const app of applications) {
    // Skip if already processed
    if (app.promptPath && app.promptPath.trim() !== '') {
      continue;
    }

    try {
      const result = await processApplication(app);
      // Update the application object in the array
      app.courseName = result.courseName;
      app.universityName = result.universityName;
      app.promptPath = result.promptPath;
      processedCount++;
    } catch (error) {
      logger.error(`Failed to process application for ${app.candidateName}. Skipping.`, error.message);
      // Mark as failed to avoid retrying every time
      app.promptPath = 'FAILED_PROCESSING';
    }
  }
  
  if (processedCount > 0) {
    logger.info(`Processed ${processedCount} new application(s).`);
    await csvService.writeApplications(applications);
  } else {
    logger.info('No new applications to process. All entries are up-to-date.');
  }

  logger.info('--- Process Complete ---');
}

main().catch(err => logger.error('An unexpected fatal error occurred in the main process.', err));