// I see - pattern 3 matches when there are spaces in the regex!
// The source regex has no spaces, but the test input has spaces
// Let me check the actual bytes in the source file

import fs from 'fs';
const content = fs.readFileSync('./src/utils/dictationCanonicalizer.ts', 'utf8');

// Find the SAFE_FORWARD_SLASH_RE line
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('SAFE_FORWARD_SLASH_RE')) {
    console.log(`Line ${i + 1}: ${JSON.stringify(lines[i])}`);
  }
}
