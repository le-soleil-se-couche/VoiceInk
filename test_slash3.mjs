// Test the regex directly - the pattern requires adjacent chars
const SAFE_FORWARD_SLASH_RE = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;

const tests = [
  "a 斜杠 b",      // no spaces - should match
  "a 斜杠 b",     // with space before
  "a 斜杠 b",     // with space after
  "a 斜杠 b",     // with spaces both sides
];

for (const test of tests) {
  const regex = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;
  const matches = test.match(regex);
  console.log(`"${test}" (${test.length} chars): matches=${matches}`);
  console.log(`  Replace: "${test.replace(regex, '$1/$3')}"`);
}
