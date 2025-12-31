#!/usr/bin/env node

/**
 * extract-content.js
 * Extracts readable content from a URL using Mozilla's Readability
 */

// Set NODE_PATH to find globally installed modules
if (!process.env.NODE_PATH) {
  const { execSync } = require('child_process');
  process.env.NODE_PATH = execSync('npm root -g').toString().trim();
  require('module').Module._initPaths();
}

const https = require('https');
const http = require('http');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const URL_ARG = process.argv[2];
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

if (!URL_ARG) {
  console.error('Usage: extract-content.js <url>');
  process.exit(1);
}

// Validate URL format
try {
  new URL(URL_ARG);
} catch (err) {
  console.error(`Error: Invalid URL: ${URL_ARG}`);
  process.exit(1);
}

/**
 * Fetch URL content with retries
 */
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetchURL(url);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      console.error(`Attempt ${attempt} failed, retrying...`);
      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}

/**
 * Fetch URL content
 */
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: TIMEOUT_MS
    };

    const req = protocol.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      // Check content type
      const contentType = res.headers['content-type'] || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        reject(new Error(`Not HTML content: ${contentType}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main execution
 */
async function main() {
  try {
    console.error(`Fetching: ${URL_ARG}`);
    const html = await fetchWithRetry(URL_ARG);

    console.error(`Parsing HTML...`);
    const dom = new JSDOM(html, { url: URL_ARG });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      console.error('Error: Could not extract readable content from URL');
      process.exit(1);
    }

    // Check if content is too short
    if (article.textContent && article.textContent.length < 100) {
      console.error('Warning: Extracted content is very short (<100 chars)');
    }

    // Output JSON
    const output = {
      title: article.title || 'Untitled',
      byline: article.byline || '',
      content: article.content || '',
      textContent: article.textContent || '',
      excerpt: article.excerpt || '',
      siteName: article.siteName || '',
      sourceURL: URL_ARG
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
