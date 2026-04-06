// Test colloquial expressions that should be preserved

const colloquialClassifiers = [
  "本", // books
  "层", // floors/layers
  "天", // days
  "句", // sentences
  "门", // subjects/courses
  "首", // songs/poems
  "封", // letters
  "张", // sheets/papers
  "杯", // cups
  "碗", // bowls
  "盘", // plates
  "锅", // pots
  "桌", // tables
  "床", // beds
  "树", // trees
  "花", // flowers
  "草", // grass
  "狗", // dogs
  "猫", // cats
];

console.log("Common colloquial classifiers that should be protected:");
console.log(colloquialClassifiers.join(", "));

// Test cases
const testCases = [
  { input: "我买了三本书", expected: "我买了三本书", reason: "colloquial: books" },
  { input: "等了八天", expected: "等了八天", reason: "colloquial: days" },
  { input: "这楼有七层", expected: "这楼有七层", reason: "colloquial: floors" },
  { input: "说了十句话", expected: "说了十句话", reason: "colloquial: sentences" },
  { input: "养了两只猫", expected: "养了两只猫", reason: "colloquial: cats" },
  { input: "种了三棵树", expected: "种了三棵树", reason: "colloquial: trees" },
  { input: "喝了五杯水", expected: "喝了五杯水", reason: "colloquial: cups" },
];

console.log("\nTest cases that should NOT be converted:");
testCases.forEach(t => console.log(`  "${t.input}" - ${t.reason}`));
