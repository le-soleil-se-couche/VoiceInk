// Test without the space in the regex
const pattern1 = /([A-Za-z0-9._~-])(斜杠 | 杠)([A-Za-z0-9._~-])/g;
const pattern2 = /([A-Za-z0-9._~-])(斜杠)([A-Za-z0-9._~-])/g;
const pattern3 = /([A-Za-z0-9._~-]) 斜杠 ([A-Za-z0-9._~-])/g;

const test = "a 斜杠 b";
console.log("Pattern 1 (斜杠 | 杠):", pattern1.test(test));
console.log("Pattern 2 (斜杠):", pattern2.test(test));
console.log("Pattern 3 (斜杠 with spaces):", pattern3.test(test));

const test2 = "a 斜杠 b";
console.log("\nPattern 1 (斜杠 | 杠):", pattern1.test(test2));
console.log("Pattern 2 (斜杠):", pattern2.test(test2));
console.log("Pattern 3 (斜杠 with spaces):", pattern3.test(test2));
