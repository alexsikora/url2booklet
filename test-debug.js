const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

async function test() {
  const url = 'https://www.macstories.net/stories/clawdbot-showed-me-what-the-future-of-personal-ai-assistants-looks-like/';
  const resp = await fetch(url);
  const html = await resp.text();
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;
  
  // Check images in content area
  const imgs = doc.querySelectorAll('article img');
  console.log('Found', imgs.length, 'images in article');
  
  // Check our content selectors
  const selectors = ['.post-content img', '.entry-content img', 'article img', 'figure img'];
  for (const sel of selectors) {
    const count = doc.querySelectorAll(sel).length;
    if (count > 0) console.log(sel + ':', count);
  }
  
  // Replace first few images with placeholders
  let replaced = 0;
  imgs.forEach((img, i) => {
    if (i < 3) {
      const span = doc.createElement('p');  // use <p> instead of span
      span.textContent = `[IMAGE_PLACEHOLDER_${i}]`;
      img.parentNode.replaceChild(span, img);
      replaced++;
    }
  });
  console.log('Replaced', replaced, 'images with placeholders');
  
  const reader = new Readability(doc);
  const article = reader.parse();
  
  // Check which placeholders survived
  for (let i = 0; i < 3; i++) {
    const marker = `IMAGE_PLACEHOLDER_${i}`;
    const survived = article.content.includes(marker);
    console.log(`Placeholder ${i} survived:`, survived);
    if (!survived) {
      // Check if its in textContent
      console.log(`  In textContent:`, article.textContent.includes(marker));
    }
  }
}
test();
