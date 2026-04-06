// Test with truly no spaces
const SAFE_FORWARD_SLASH_RE = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;

const testNoSpace = "a 斜杠 b";
const testWithSpace = "a 斜杠 b";

console.log("No space input:", JSON.stringify(testNoSpace), "len:", testNoSpace.length);
console.log("Match:", SAFE_FORWARD_SLASH_RE.test(testNoSpace));

console.log("\nWith space input:", JSON.stringify(testWithSpace), "len:", testWithSpace.length);
console.log("Match:", SAFE_FORWARD_SLASH_RE.test(testWithSpace));
