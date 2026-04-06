import fs from 'fs';
const content = fs.readFileSync('./src/utils/__tests__/dictationCanonicalizer.test.ts', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('斜杠高置信')) {
    console.log(`Line ${i + 1}: ${JSON.stringify(lines[i])}`);
  }
}
