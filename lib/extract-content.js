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
 * Extract content images from the document before Readability processing
 * Returns array of {src, alt, caption} objects
 */
function extractContentImages(document, baseUrl) {
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
      
      // Get caption if available
      let caption = img.getAttribute('alt') || '';
      const parent = img.parentElement;
      if (parent) {
        const captionEl = parent.querySelector('.caption, .image-caption, figcaption');
        if (captionEl) {
          caption = captionEl.textContent.trim() || caption;
        }
      }
      
      images.push({ src, alt: img.getAttribute('alt') || '', caption });
    });
  }
  
  return images;
}

/**
 * Inject images into article content at appropriate positions
 */
function injectImages(content, images) {
  if (!images.length) return content;
  
  // Check how many images are already in the content
  const existingCount = (content.match(/<img/gi) || []).length;
  
  // If content already has most images, skip injection
  if (existingCount >= images.length * 0.7) {
    return content;
  }
  
  // Create image HTML
  const imageHtml = images.map(img => {
    const caption = img.caption ? `<p class="image-caption">${img.caption}</p>` : '';
    return `<figure class="injected-image"><img src="${img.src}" alt="${img.alt || ''}">${caption}</figure>`;
  }).join('\n');
  
  // Find a good insertion point - after the first paragraph
  const firstPEnd = content.indexOf('</p>');
  if (firstPEnd > 0) {
    // Insert first image after first paragraph, rest distributed through content
    const firstImage = images[0];
    const firstAlt = firstImage.alt || '';
    const firstCaption = firstImage.caption || '';
    const firstImgHtml = '<figure class="injected-image"><img src="' + firstImage.src + '" alt="' + firstAlt + '"><p class="image-caption">' + firstCaption + '</p></figure>';
    
    let result = content.slice(0, firstPEnd + 4) + '\n' + firstImgHtml + '\n' + content.slice(firstPEnd + 4);
    
    // Add remaining images before the last paragraph
    if (images.length > 1) {
      const remainingImages = images.slice(1).map(img => {
        const caption = img.caption ? `<p class="image-caption">${img.caption}</p>` : '';
        return `<figure class="injected-image"><img src="${img.src}" alt="${img.alt || ''}">${caption}</figure>`;
      }).join('\n');
      
      // Find last paragraph
      const lastPStart = result.lastIndexOf('<p');
      if (lastPStart > 0) {
        result = result.slice(0, lastPStart) + remainingImages + '\n' + result.slice(lastPStart);
      }
    }
    
    return result;
  }
  
  // Fallback: prepend all images
  return imageHtml + '\n' + content;
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
    
    // Extract images BEFORE Readability processes (and potentially strips) them
    const contentImages = extractContentImages(document, URL_ARG);
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
    
    // Inject images if Readability stripped them
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
    process.exit(1);
  }
}

main();
