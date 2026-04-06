// The regex has spaces! Let me check the actual source
const SAFE_FORWARD_SLASH_RE = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;

// Test without spaces
const testNoSpace = "a 斜杠 b";
console.log("No space test:", testNoSpace);
console.log("  Match:", SAFE_FORWARD_SLASH_RE.test(testNoSpace));
console.log("  Replace:", testNoSpace.replace(SAFE_FORWARD_SLASH_RE, '$1/$3'));

// Test with the actual pattern
const actualPattern = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;
console.log("\nActual pattern test:");
console.log("  Match:", actualPattern.test(testNoSpace));
