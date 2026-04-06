// Test without spaces in the input
const SAFE_FORWARD_SLASH_RE = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;

const testNoSpace = "a 斜杠 b";  // No spaces around 斜杠
console.log("Input:", testNoSpace, "len:", testNoSpace.length);
for (let i = 0; i < testNoSpace.length; i++) {
  console.log(`  [${i}]: "${testNoSpace[i]}"`);
}
console.log("Match:", SAFE_FORWARD_SLASH_RE.test(testNoSpace));
console.log("Replace:", testNoSpace.replace(SAFE_FORWARD_SLASH_RE, '$1/$3'));
