// Debug more carefully
const test1 = "a 斜杠 b";
const test2 = "a 斜杠 b";

console.log("Test 1:");
for (let i = 0; i < test1.length; i++) {
  console.log(`  [${i}]: "${test1[i]}" charCode: ${test1.charCodeAt(i)} hex: ${test1.charCodeAt(i).toString(16)}`);
}

console.log("\nTest 2:");
for (let i = 0; i < test2.length; i++) {
  console.log(`  [${i}]: "${test2[i]}" charCode: ${test2.charCodeAt(i)} hex: ${test2.charCodeAt(i).toString(16)}`);
}

// Check if they're the same
console.log("\nAre they equal?", test1 === test2);
