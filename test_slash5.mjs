// The pattern is: 斜杠 but the test has 斜杠 (two chars)
// Let me check what the actual pattern expects

const pattern1 = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;
const pattern2 = /([A-Za-z0-9._~-])(斜杠)([A-Za-z0-9._~-])/g;

const test1 = "a 斜杠 b";  // 斜 + 杠 (2 chars)
const test2 = "a 斜杠 b"; // 斜杠 (1 char)

console.log("Test 1 (斜 + 杠):", test1, "len:", test1.length);
console.log("  pattern1 match:", pattern1.test(test1));
console.log("  pattern2 match:", pattern2.test(test1));

console.log("Test 2 (斜杠):", test2, "len:", test2.length);
console.log("  pattern1 match:", pattern1.test(test2));
console.log("  pattern2 match:", pattern2.test(test2));
