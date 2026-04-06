// Debug the actual bytes
const tests = [
  "a 斜杠 b",
  "a 斜杠 b",
];

for (const test of tests) {
  console.log(`"${test}" (${test.length} chars):`);
  for (let i = 0; i < test.length; i++) {
    console.log(`  [${i}]: "${test[i]}" (code: ${test.charCodeAt(i)})`);
  }
}
