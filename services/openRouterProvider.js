// services/openRouterProvider.js
const config = require('../config');
const logger = require('../utils/logger');

async function generateSopFromPrompt(promptText) {
  const { apiUrl, model, httpReferer, siteName } = config.openRouter;
  logger.info(`Sending prompt to OpenRouter model: ${model}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': httpReferer,
        'X-Title': siteName,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: promptText }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter API request failed: ${response.status} - ${errorBody}`);
    }

    // --- KEY CHANGE: Add detailed logging ---
    // Let's consume the JSON and log it immediately to see what we got.
    const data = await response.json();
    logger.info("Received JSON data from OpenRouter:");
    console.log(JSON.stringify(data, null, 2)); // Pretty-print the JSON object

    // Now, we can safely try to access the content
    const sopText = data?.choices?.[0]?.message?.content;

    if (!sopText) {
      // This error will now be more meaningful because we've seen the JSON above.
      logger.error('Could not find "content" in the API response structure.', data);
      throw new Error('No content found in OpenRouter API response.');
    }

    logger.success('SOP content successfully extracted from API response.');
    return sopText;

  } catch (error) {
    // This will catch errors from fetch(), response.json(), or our own thrown error.
    logger.error('An error occurred within the OpenRouter service.', error);
    throw error; // Re-throw to be handled by the main process
  }
}

module.exports = { generateSopFromPrompt };