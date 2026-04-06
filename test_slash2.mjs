// Test the regex directly
const SAFE_FORWARD_SLASH_RE = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;

const test1 = "a 斜杠 b";
const test2 = "a 斜杠 b";  // with spaces

console.log("Test 1 (no spaces):", test1);
console.log("  Match:", SAFE_FORWARD_SLASH_RE.test(test1));
console.log("  Replace:", test1.replace(SAFE_FORWARD_SLASH_RE, '$1/$3'));

console.log("Test 2 (with spaces):", test2);
console.log("  Match:", SAFE_FORWARD_SLASH_RE.test(test2));
console.log("  Replace:", test2.replace(SAFE_FORWARD_SLASH_RE, '$1/$3'));
