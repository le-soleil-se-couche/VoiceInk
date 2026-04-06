// Test the exact regex from the source
const SAFE_FORWARD_SLASH_RE = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;

// No spaces
const test1 = "a 斜杠 b";
console.log("Test 1 (a 斜杠 b):", SAFE_FORWARD_SLASH_RE.test(test1));

// Reset regex
const SAFE_FORWARD_SLASH_RE2 = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;
const test2 = "a 斜杠 b";
console.log("Test 2 (a 斜杠 b):", SAFE_FORWARD_SLASH_RE2.test(test2));
