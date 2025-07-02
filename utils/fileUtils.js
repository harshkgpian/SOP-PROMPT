// utils/fileUtils.js
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const config = require('../config');
const logger = require('./logger');

async function fetchCourseTextFromUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const html = await res.text();
    return html.replace(/<[^>]+>/g, ' ').replace(/\s\s+/g, ' ').trim();
  } catch (error) {
    logger.error(`Failed to fetch from URL ${url}`, error);
    throw error; // Re-throw to be caught by the main process
  }
}

async function readResumeContent(filename) {
  if (!filename) {
    logger.warn('No resume filename provided for this application.');
    return null;
  }
  const pdfPath = path.join(config.paths.resumes, `${filename}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    logger.error(`Resume file not found at: ${pdfPath}`);
    return null;
  }
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    logger.error(`Failed to read or parse resume PDF: ${pdfPath}`, error);
    return null;
  }
}

function sanitizeFileName(name) {
  if (!name) return 'untitled';
  return name.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]+/g, '').toLowerCase();
}

function savePromptToFile(promptText, fileName) {
    const promptsDir = config.paths.prompts;
    if (!fs.existsSync(promptsDir)) {
        fs.mkdirSync(promptsDir, { recursive: true });
    }
    const filePath = path.join(promptsDir, fileName);
    fs.writeFileSync(filePath, promptText, 'utf8');
    return filePath;
}

module.exports = {
  fetchCourseTextFromUrl,
  readResumeContent,
  sanitizeFileName,
  savePromptToFile,
};