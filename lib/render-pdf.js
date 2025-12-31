#!/usr/bin/env node

/**
 * render-pdf.js
 * Renders HTML to PDF using Puppeteer
 */

// Set NODE_PATH to find globally installed modules
if (!process.env.NODE_PATH) {
  const { execSync } = require('child_process');
  process.env.NODE_PATH = execSync('npm root -g').toString().trim();
  require('module').Module._initPaths();
}

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const HTML_FILE = process.argv[2];
const OUTPUT_PDF = process.argv[3];
const RENDER_TIMEOUT_MS = 60000;

if (!HTML_FILE || !OUTPUT_PDF) {
  console.error('Usage: render-pdf.js <html-file> <output-pdf>');
  process.exit(1);
}

// Check if HTML file exists
if (!fs.existsSync(HTML_FILE)) {
  console.error(`Error: HTML file not found: ${HTML_FILE}`);
  process.exit(1);
}

/**
 * Main execution
 */
async function main() {
  let browser;

  try {
    console.error('Launching headless Chrome...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Read HTML content
    console.error(`Reading HTML from: ${HTML_FILE}`);
    const htmlContent = fs.readFileSync(HTML_FILE, 'utf-8');

    // Read CSS
    const cssPath = path.join(__dirname, 'print-styles.css');
    let cssContent = '';
    if (fs.existsSync(cssPath)) {
      cssContent = fs.readFileSync(cssPath, 'utf-8');
    }

    // Wrap HTML with complete structure and CSS
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${cssContent}
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    // Set content
    await page.setContent(fullHTML, {
      waitUntil: 'networkidle0',
      timeout: RENDER_TIMEOUT_MS
    });

    console.error('Generating PDF...');
    await page.pdf({
      path: OUTPUT_PDF,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      preferCSSPageSize: false
    });

    console.error(`PDF created: ${OUTPUT_PDF}`);
    await browser.close();
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
