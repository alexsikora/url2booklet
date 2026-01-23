#!/usr/bin/env node

/**
 * extract-content.js
 * Extracts readable content from a URL using Mozilla's Readability
 * Enhanced to preserve images that Readability might strip
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
 * Collect images from content areas before Readability processes
 * Returns array of {src, alt, caption, precedingText} objects
 */
function collectContentImages(document, baseUrl) {
  const images = [];
  const seen = new Set();

  // Look for images in likely content areas
  const contentSelectors = [
    '.post-content img',
    '.entry-content img',
    '.article-content img',
    '.content img',
    'article img',
    '.media-wrapper img',
    'figure img',
    '.wp-block-image img'
  ];

  for (const selector of contentSelectors) {
    document.querySelectorAll(selector).forEach(img => {
      let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (!src || seen.has(src)) return;

      // Skip tiny/icon images
      const width = parseInt(img.getAttribute('width')) || 0;
      const height = parseInt(img.getAttribute('height')) || 0;
      if ((width > 0 && width < 100) || (height > 0 && height < 100)) return;

      // Skip common non-content images
      if (src.includes('gravatar') || src.includes('avatar') ||
          src.includes('icon') || src.includes('logo') ||
          src.includes('tracking') || src.includes('pixel')) {
        return;
      }

      // Make URL absolute
      if (!src.startsWith('http')) {
        try {
          src = new URL(src, baseUrl).href;
        } catch (e) {
          return;
        }
      }

      seen.add(src);

      // Get caption/alt
      let caption = img.getAttribute('alt') || '';
      const parent = img.parentElement;
      if (parent) {
        const captionEl = parent.querySelector('.caption, .image-caption, figcaption');
        if (captionEl) {
          caption = captionEl.textContent.trim() || caption;
        }
      }

      // Get preceding paragraph text (for matching later)
      let precedingText = '';
      let prev = img.closest('p, figure, div')?.previousElementSibling;
      while (prev && !precedingText) {
        if (prev.tagName === 'P') {
          precedingText = prev.textContent.trim().substring(0, 100);
        }
        prev = prev.previousElementSibling;
      }

      images.push({ src, alt: img.getAttribute('alt') || '', caption, precedingText });
    });
  }

  return images;
}

/**
 * Inject collected images back into content
 * Tries to match by preceding paragraph text, falls back to distributing evenly
 */
function injectImages(content, images) {
  if (!images.length) return content;

  const dom = new JSDOM(`<div>${content}</div>`);
  const container = dom.window.document.querySelector('div');
  const paragraphs = container.querySelectorAll('p');
  
  if (paragraphs.length === 0) {
    // No paragraphs, just append all images at the end
    let imageHtml = '';
    for (const img of images) {
      const caption = img.caption ? `<figcaption>${img.caption}</figcaption>` : '';
      imageHtml += `<figure class="article-image"><img src="${img.src}" alt="${img.alt || ''}">${caption}</figure>\n`;
    }
    return content + imageHtml;
  }

  // Try to place images after matching paragraphs
  const usedImages = new Set();
  
  for (const img of images) {
    if (img.precedingText) {
      // Find paragraph containing this text
      for (const p of paragraphs) {
        const pText = p.textContent.trim().substring(0, 100);
        if (pText && img.precedingText && pText.includes(img.precedingText.substring(0, 50))) {
          const caption = img.caption ? `<figcaption>${img.caption}</figcaption>` : '';
          const figure = dom.window.document.createElement('figure');
          figure.className = 'article-image';
          figure.innerHTML = `<img src="${img.src}" alt="${img.alt || ''}">${caption}`;
          p.after(figure);
          usedImages.add(img.src);
          break;
        }
      }
    }
  }

  // For remaining images, distribute evenly through the content
  const remainingImages = images.filter(img => !usedImages.has(img.src));
  if (remainingImages.length > 0) {
    const interval = Math.max(1, Math.floor(paragraphs.length / (remainingImages.length + 1)));
    let imgIndex = 0;
    
    for (let i = interval; i < paragraphs.length && imgIndex < remainingImages.length; i += interval) {
      const img = remainingImages[imgIndex];
      const caption = img.caption ? `<figcaption>${img.caption}</figcaption>` : '';
      const figure = dom.window.document.createElement('figure');
      figure.className = 'article-image';
      figure.innerHTML = `<img src="${img.src}" alt="${img.alt || ''}">${caption}`;
      paragraphs[i].after(figure);
      imgIndex++;
    }
    
    // Any remaining images go at the end
    while (imgIndex < remainingImages.length) {
      const img = remainingImages[imgIndex];
      const caption = img.caption ? `<figcaption>${img.caption}</figcaption>` : '';
      const figure = dom.window.document.createElement('figure');
      figure.className = 'article-image';
      figure.innerHTML = `<img src="${img.src}" alt="${img.alt || ''}">${caption}`;
      container.appendChild(figure);
      imgIndex++;
    }
  }

  return container.innerHTML;
}

/**
 * Fix relative URLs in content
 */
function fixUrls(content, baseUrl) {
  if (!content) return content;
  
  return content.replace(/src="([^"]+)"/g, (match, src) => {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return match;
    }
    try {
      const absoluteUrl = new URL(src, baseUrl).href;
      return `src="${absoluteUrl}"`;
    } catch (e) {
      return match;
    }
  });
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
    const document = dom.window.document;

    // Collect images BEFORE Readability processes (it strips them)
    const contentImages = collectContentImages(document, URL_ARG);
    if (contentImages.length > 0) {
      console.error(`   Found ${contentImages.length} content images`);
    }

    const reader = new Readability(document);
    const article = reader.parse();

    if (!article) {
      console.error('Error: Could not extract readable content from URL');
      process.exit(1);
    }

    // Check if content is too short
    if (article.textContent && article.textContent.length < 100) {
      console.error('Warning: Extracted content is very short (<100 chars)');
    }

    // Fix URLs first
    let finalContent = fixUrls(article.content, URL_ARG);

    // Inject collected images back into content
    finalContent = injectImages(finalContent, contentImages);
    
    // Count images in final output
    const imgCount = (finalContent.match(/<img/gi) || []).length;
    if (imgCount > 0) {
      console.error(`   Output contains ${imgCount} images`);
    }

    // Output JSON
    const output = {
      title: article.title || 'Untitled',
      byline: article.byline || '',
      content: finalContent,
      textContent: article.textContent || '',
      excerpt: article.excerpt || '',
      siteName: article.siteName || '',
      sourceURL: URL_ARG
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
