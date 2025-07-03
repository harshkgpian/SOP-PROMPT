// generateSOP.js
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const csvService = require('./services/csvService');
const openRouterProvider = require('./services/openRouterProvider');

async function processApplication(app) {
  logger.info(`Generating SOP for: ${app.candidateName} - ${app.courseName}`);

  // 1. Validate and read the prompt file
  const promptPath = app.promptPath;
  if (!promptPath || !fs.existsSync(promptPath)) {
    logger.error(`Prompt file not found for this application: ${promptPath || 'path not specified'}`);
    // This is a critical, non-recoverable error for this run.
    throw new Error('PROMPT_FILE_MISSING');
  }
  const promptText = fs.readFileSync(promptPath, 'utf8');

  // 2. Call OpenRouter to generate the SOP
  // This can fail due to network issues, API limits, etc.
  const sopText = await openRouterProvider.generateSopFromPrompt(promptText);

  // 3. Save the generated SOP to a file
  const sopsDir = config.paths.sops;
  if (!fs.existsSync(sopsDir)) {
    fs.mkdirSync(sopsDir, { recursive: true });
  }

  // Create a corresponding filename for the SOP
  const promptFileName = path.basename(promptPath);
  // Ensure the replacement logic is robust
  const sopFileName = promptFileName.replace(/_prompt\.txt$/i, '_sop.txt');
  const sopFilePath = path.join(sopsDir, sopFileName);
  
  fs.writeFileSync(sopFilePath, sopText, 'utf8');
  logger.success(`SOP saved to: ${sopFilePath}`);

  // 4. Return the path to be updated in the CSV
  // This now happens only after the file is successfully written.
  return sopFilePath;
}


async function main() {
  logger.info('--- Starting Final SOP Generation Process ---');
  let allApplications = await csvService.readApplications();

  // Find applications that have a prompt but not a final SOP yet
  const appsToProcess = allApplications.filter(
    app => app.promptPath && !app.promptPath.includes('FAILED') && (!app.sopPath || app.sopPath.trim() === '')
  );

  if (appsToProcess.length === 0) {
    logger.info('No new prompts to process. All SOPs seem to be generated or marked as failed.');
    return;
  }
  
  logger.info(`Found ${appsToProcess.length} new application(s) to generate SOPs for.`);

  let processedCount = 0;
  let hasChanges = false;

  for (const app of allApplications) {
      // Check if this app is in our processing queue
      if (!appsToProcess.includes(app)) {
          continue;
      }

      try {
        const sopPathResult = await processApplication(app);
        // On success, update the sopPath
        app.sopPath = sopPathResult;
        processedCount++;
        hasChanges = true;
      } catch (error) {
        logger.error(`Failed to generate SOP for ${app.candidateName}. Skipping for this run.`);
        
        // **KEY CHANGE**: Only mark as failed for critical errors.
        // For transient errors (like API timeouts), we do nothing,
        // so it will be retried on the next run.
        if (error.message === 'PROMPT_FILE_MISSING') {
          app.sopPath = 'FAILED_MISSING_PROMPT';
          hasChanges = true;
        }
        // If it was another error (e.g., from OpenRouter), we simply log it and don't
        // update the CSV for this row, allowing a retry.
      }
  }
  
  if (hasChanges) {
    if(processedCount > 0) {
        logger.info(`Successfully generated and saved ${processedCount} new SOP(s).`);
    } else {
        logger.warn('No SOPs were successfully generated, but CSV updated with failure states.');
    }
    await csvService.writeApplications(allApplications);
  } else {
    logger.info('No changes were made to the CSV file in this run.');
  }

  logger.info('--- SOP Generation Process Complete ---');
}

main().catch(err => logger.error('An unexpected fatal error occurred in the main SOP generation process.', err));