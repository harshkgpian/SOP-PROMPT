// services/csvService.js
const fs = require('fs');
const csvParser = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const config = require('../config');
const logger = require('../utils/logger');

async function readApplications() {
  const { csvFile, data } = config.paths;
  const results = [];

  if (!fs.existsSync(data)) fs.mkdirSync(data, { recursive: true });

  if (!fs.existsSync(csvFile)) {
    logger.warn(`CSV file not found at ${csvFile}. Creating it with headers.`);
    const writer = createObjectCsvWriter({ path: csvFile, header: config.csvHeaders });
    await writer.writeRecords([]); // Writes only the header
    return [];
  }

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFile)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => {
        logger.error('Error reading CSV file.', error);
        reject(error);
      });
  });
}

async function writeApplications(data) {
  const writer = createObjectCsvWriter({
    path: config.paths.csvFile,
    header: config.csvHeaders,
  });
  await writer.writeRecords(data);
  logger.success(`CSV file updated successfully at: ${config.paths.csvFile}`);
}

module.exports = { readApplications, writeApplications };