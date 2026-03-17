import fs from 'fs';

const html = fs.readFileSync('C:\\Users\\HY\\.claude\\projects\\F--mycode-claudecode\\fbe70dfe-61f4-4fc3-a21e-f73bea2c0485\\tool-results\\bfqf7x981.txt', 'utf8');

// Try to extract content from the page
console.log('=== Page Title ===');
const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
if (titleMatch) console.log(titleMatch[1]);

console.log('\n=== Meta Description ===');
const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i);
if (descMatch) console.log(descMatch[1]);

// Extract script tags that might contain data
console.log('\n=== Looking for JSON data in scripts ===');
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptCount = 0;
while ((match = scriptRegex.exec(html)) !== null && scriptCount < 10) {
    const scriptContent = match[1];
    if (scriptContent.includes('props') || scriptContent.includes('pageProps') || scriptContent.includes('content')) {
        console.log(`\n--- Script ${scriptCount} (contains data keywords) ---`);
        // Try to find JSON-like content
        const jsonMatches = scriptContent.match(/\{[\s\S]{100,2000}\}/g);
        if (jsonMatches) {
            jsonMatches.forEach((json, i) => {
                console.log(`\nJSON snippet ${i}:`);
                console.log(json.substring(0, 500));
            });
        }
    }
    scriptCount++;
}

// Try to extract visible text
console.log('\n=== Extracting visible text ===');
// Remove scripts and styles
let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
// Remove HTML tags
text = text.replace(/<[^>]+>/g, ' ');
// Collapse whitespace
text = text.replace(/\s+/g, ' ').trim();
console.log(text.substring(0, 3000));
