// services/openRouterService.js
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Sends a prompt to the OpenRouter API and returns the generated text.
 * @param {string} promptText The complete prompt to send to the model.
 * @returns {Promise<string|null>} The generated SOP text, or null if an error occurs.
 */
async function generateSop(promptText) {
  const { apiKey, modelName, siteUrl, appName } = config.openRouter;
  const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  logger.info(`Sending prompt to OpenRouter model: ${modelName}...`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Recommended headers by OpenRouter
        'HTTP-Referer': siteUrl,
        'X-Title': appName,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'user', content: promptText },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter API request failed: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const sopText = data?.choices?.[0]?.message?.content;

    if (!sopText) {
      throw new Error('No content returned in OpenRouter API response.');
    }

    logger.success('Successfully received SOP from OpenRouter.');
    return sopText.trim();

  } catch (error) {
    logger.error('Failed to generate SOP from OpenRouter.', error);
    // We re-throw so the main orchestrator can handle the application state
    throw error;
  }
}

module.exports = { generateSop };