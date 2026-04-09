import { describe, expect, it } from "vitest";
import {
  isAnswerLikeTranscriptionOutput,
  isQuestionLikeDictation,
  shouldBlockQuestionAnswerization,
  hasCodeOrStructuredContent,
  shouldBlockCodeOrStructuredContentRewrite,
} from "../answerGuard";

describe("answerGuard", () => {
  it("detects existing assistant-style ASR disclaimers", () => {
    expect(
      isAnswerLikeTranscriptionOutput("As an AI language model, I can't help with that request directly.")
    ).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("short text")).toBe(false);
  });

  it("detects summary-style answer-like patterns for non-code contexts", () => {
    // Summary patterns - these patterns are also in ReasoningService.isAnswerLikeOutput()
    expect(isAnswerLikeTranscriptionOutput("In summary, the main points are")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("To summarize what you said")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Here's a summary of your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me summarize your notes")).toBe(true);
    
    // Here-is patterns
    expect(isAnswerLikeTranscriptionOutput("Here is what you dictated")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Here's the cleaned version")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Here's your polished text")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Here's your formatted document")).toBe(true);
    
    // Below/following patterns
    expect(isAnswerLikeTranscriptionOutput("Below is the revised version")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Below is your cleaned text")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("The following is the cleaned text")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("The following is your polished dictation")).toBe(true);
    
    // I've cleaned/polished patterns
    expect(isAnswerLikeTranscriptionOutput("I've cleaned up your text")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I've polished your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I have formatted your document")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I've organized your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I've summarized your meeting notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I've revised the document")).toBe(true);
    
    // Let me constructions
    expect(isAnswerLikeTranscriptionOutput("Let me summarize your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me review your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me explain what you said")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me clarify your statement")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me rephrase your text")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me rewrite your sentence")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me clean up your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me polish your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me format your document")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me organize your content")).toBe(true);
    
    // I will constructions
    expect(isAnswerLikeTranscriptionOutput("I will summarize your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I will review your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I will explain what you said")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I will clarify your statement")).toBe(true);
    
    // I'll constructions
    expect(isAnswerLikeTranscriptionOutput("I'll summarize your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I'll review your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I'll explain what you said")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I'll clarify your statement")).toBe(true);
    
    // Conclusion markers
    expect(isAnswerLikeTranscriptionOutput("In conclusion, the main points are")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("To conclude, we should focus on")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("To wrap up, here are the key takeaways")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("To sum up, the findings show")).toBe(true);
    
    // My response/answer patterns
    expect(isAnswerLikeTranscriptionOutput("My response is based on your input")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("My answer would be to focus on")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("My suggestion is to clean up")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("My recommendation would be to revise")).toBe(true);
    
    // Based on patterns
    expect(isAnswerLikeTranscriptionOutput("Based on your input, I cleaned")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Based on the dictation, here is")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Based on your notes, I polished")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Based on the text, I organized")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Based on your content, I reformatted")).toBe(true);
  });

  it("does not flag short text as answer-like", () => {
    expect(isAnswerLikeTranscriptionOutput("In summary")).toBe(false);
    expect(isAnswerLikeTranscriptionOutput("Here's the thing")).toBe(false);
    expect(isAnswerLikeTranscriptionOutput("Below is")).toBe(false);
    expect(isAnswerLikeTranscriptionOutput("I've done it")).toBe(false);
  });

  it("detects Chinese and English question-like dictation", () => {
    expect(isQuestionLikeDictation("5+5 等于几")).toBe(true);
    expect(isQuestionLikeDictation("你明天会来吗")).toBe(true);
    expect(isQuestionLikeDictation("他明天来不来")).toBe(true);
    expect(isQuestionLikeDictation("What time is the deploy?")).toBe(true);
    expect(isQuestionLikeDictation("What's the deploy time")).toBe(true);
    expect(isQuestionLikeDictation("Where's the build artifact")).toBe(true);
    expect(isQuestionLikeDictation("Has the deploy finished")).toBe(true);
    expect(isQuestionLikeDictation("we should ship this today or not")).toBe(true);
    expect(isQuestionLikeDictation("we should ship this today yes or no")).toBe(true);
    expect(isQuestionLikeDictation("the deploy is ready, isn't it")).toBe(true);
    expect(isQuestionLikeDictation("I wonder if this needs a migration")).toBe(true);
    expect(isQuestionLikeDictation("need to know if this needs a migration")).toBe(true);
    expect(isQuestionLikeDictation("tell me if this needs a migration")).toBe(true);
    expect(isQuestionLikeDictation("please confirm whether the deploy finished")).toBe(true);
    expect(isQuestionLikeDictation("please advise whether the deploy finished")).toBe(true);
    expect(isQuestionLikeDictation("please confirm the deploy finished")).toBe(true);
    expect(isQuestionLikeDictation("check the build is ready")).toBe(true);
    expect(isQuestionLikeDictation("明天继续部署")).toBe(false);
    expect(isQuestionLikeDictation("check the logs")).toBe(false);
  });

  it("blocks question dictation when reasoning turns it into an answer", () => {
    expect(shouldBlockQuestionAnswerization("5+5 等于几", "10")).toBe(true);
    expect(shouldBlockQuestionAnswerization("你明天会来吗", "我明天会来")).toBe(true);
    expect(shouldBlockQuestionAnswerization("他明天来不来", "他明天来")).toBe(true);
    expect(shouldBlockQuestionAnswerization("5+5 等于几", "5 + 5 等于几？答案是 10。")).toBe(true);
    expect(shouldBlockQuestionAnswerization("他明天来不来", "他明天来不来？他明天来。")).toBe(true);
    expect(
      shouldBlockQuestionAnswerization("the deploy is ready, isn't it", "The deploy is ready.")
    ).toBe(true);
    expect(shouldBlockQuestionAnswerization("we should ship this today or not", "We should ship this today.")).toBe(
      true
    );
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "What time is the deploy? The deploy is at 5 PM."
      )
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "What time is the deploy?\nThe deploy is at 5 PM."
      )
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "What time is the deploy, the deploy is at 5 PM."
      )
    ).toBe(true);
    expect(shouldBlockQuestionAnswerization("5+5 等于几", "5+5 等于几，答案是 10。")).toBe(true);
    expect(shouldBlockQuestionAnswerization("What's the deploy time", "The deploy is at 5 PM.")).toBe(
      true
    );
    expect(
      shouldBlockQuestionAnswerization("Where's the build artifact", "The build artifact is in S3.")
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization("I wonder if this needs a migration", "This needs a migration.")
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "need to know if this needs a migration",
        "This needs a migration."
      )
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "please confirm whether the deploy finished",
        "The deploy has finished."
      )
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "please advise whether the deploy finished",
        "The deploy has finished."
      )
    ).toBe(true);
    expect(shouldBlockQuestionAnswerization("What time is the deploy?", "The deploy is at 5 PM.")).toBe(
      true
    );
    expect(shouldBlockQuestionAnswerization("Has the deploy finished", "The deploy has finished.")).toBe(
      true
    );
    expect(
      shouldBlockQuestionAnswerization("please confirm the deploy finished", "The deploy has finished.")
    ).toBe(true);
    expect(shouldBlockQuestionAnswerization("check the build is ready", "The build is ready.")).toBe(
      true
    );
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "I want to know what time the deploy is."
      )
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "Please tell me what time the deploy is."
      )
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "Wondering what time the deploy is."
      )
    ).toBe(true);
  });

  it("allows outputs that preserve the original question intent", () => {
    expect(shouldBlockQuestionAnswerization("5+5 等于几", "5 + 5 等于几？")).toBe(false);
    expect(shouldBlockQuestionAnswerization("他明天来不来", "他明天来不来？")).toBe(false);
    expect(shouldBlockQuestionAnswerization("What time is the deploy?", "What time is the deploy?")).toBe(
      false
    );
    expect(shouldBlockQuestionAnswerization("What's the deploy time", "What's the deploy time?")).toBe(
      false
    );
    expect(
      shouldBlockQuestionAnswerization(
        "the deploy is ready, isn't it",
        "The deploy is ready, isn't it?"
      )
    ).toBe(false);
    expect(shouldBlockQuestionAnswerization("we should ship this today or not", "Should we ship this today?")).toBe(
      false
    );
    expect(
      shouldBlockQuestionAnswerization(
        "please confirm whether the deploy finished",
        "Please confirm whether the deploy finished."
      )
    ).toBe(false);
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "What time is the deploy, please?"
      )
    ).toBe(false);
    expect(
      shouldBlockQuestionAnswerization(
        "need to know if this needs a migration",
        "Need to know if this needs a migration."
      )
    ).toBe(false);
    expect(
      shouldBlockQuestionAnswerization(
        "tell me what time the deploy is",
        "Tell me what time the deploy is."
      )
    ).toBe(false);
    expect(
      shouldBlockQuestionAnswerization(
        "please advise whether the deploy finished",
        "Please advise whether the deploy finished."
      )
    ).toBe(false);
    expect(
      shouldBlockQuestionAnswerization(
        "please confirm the deploy finished",
        "Please confirm the deploy finished."
      )
    ).toBe(false);
    expect(
      shouldBlockQuestionAnswerization(
        "I want to know what time the deploy is",
        "I want to know what time the deploy is."
      )
    ).toBe(false);
    expect(shouldBlockQuestionAnswerization("明天继续部署", "明天继续部署。")).toBe(false);
  });

  it("blocks assistant-style follow-up questions for question dictation", () => {
    expect(shouldBlockQuestionAnswerization("5+5 等于几", "你想知道五加五等于多少吗？")).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "Would you like me to tell you what time the deploy is?"
      )
    ).toBe(true);
    expect(
      shouldBlockQuestionAnswerization(
        "What time is the deploy?",
        "Can you tell me what time the deploy is?"
      )
    ).toBe(true);
  });

  it("syncs summary-style patterns with ReasoningService.isAnswerLikeOutput()", () => {
    // These patterns should match the ones added to ReasoningService.isAnswerLikeOutput()
    // for strict-mode answer-like detection in non-code document contexts.
    
    // Summary patterns
    expect(isAnswerLikeTranscriptionOutput("In summary, the main findings are")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("To summarize, we need to focus on three key areas")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Here's a summary of the meeting notes")).toBe(true);
    
    // Here's/Here is patterns presenting cleaned content
    expect(isAnswerLikeTranscriptionOutput("Here's the cleaned version of your text")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Here is your polished document")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Here's your formatted meeting notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Here's what you dictated, revised for clarity")).toBe(true);
    
    // Below/following patterns
    expect(isAnswerLikeTranscriptionOutput("Below is the revised version")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Below is your cleaned text")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("The following is the cleaned content")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("The following is your polished dictation")).toBe(true);
    
    // I've cleaned/polished patterns
    expect(isAnswerLikeTranscriptionOutput("I've cleaned up your text for you")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I've polished your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I have formatted your document")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I've organized your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I've summarized your meeting notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I've revised the document")).toBe(true);
    
    // Let me constructions
    expect(isAnswerLikeTranscriptionOutput("Let me summarize your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me review your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me explain what you said")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me clarify your statement")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me rephrase your text")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me rewrite your sentence")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me clean up your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me polish your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me format your document")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Let me organize your content")).toBe(true);
    
    // I will constructions
    expect(isAnswerLikeTranscriptionOutput("I will summarize your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I will review your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I will explain what you said")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I will clarify your statement")).toBe(true);
    
    // I'll constructions
    expect(isAnswerLikeTranscriptionOutput("I'll summarize your notes")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I'll review your dictation")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I'll explain what you said")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("I'll clarify your statement")).toBe(true);
    
    // Conclusion markers
    expect(isAnswerLikeTranscriptionOutput("In conclusion, the main points are")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("To conclude, we should focus on")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("To wrap up, here are the key takeaways")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("To sum up, the findings show")).toBe(true);
    
    // My response/answer patterns
    expect(isAnswerLikeTranscriptionOutput("My response is based on your input")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("My answer would be to focus on")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("My suggestion is to clean up")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("My recommendation would be to revise")).toBe(true);
    
    // Based on patterns
    expect(isAnswerLikeTranscriptionOutput("Based on your input, I cleaned")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Based on the dictation, here is")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Based on your notes, I polished")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Based on the text, I organized")).toBe(true);
    expect(isAnswerLikeTranscriptionOutput("Based on your content, I reformatted")).toBe(true);
  });
});

describe("hasCodeOrStructuredContent", () => {

  it("detects code fences", () => {
    expect(hasCodeOrStructuredContent("```typescript\nconst x = 1;\n```")).toBe(true);
    expect(hasCodeOrStructuredContent("```\nprint('hello')\n```")).toBe(true);
  });

  it("detects inline code", () => {
    expect(hasCodeOrStructuredContent("Use `npm install` to install")).toBe(true);
    expect(hasCodeOrStructuredContent("The `useState` hook")).toBe(true);
  });

  it("detects HTML/JSX tags", () => {
    expect(hasCodeOrStructuredContent("<div>Hello</div>")).toBe(true);
    expect(hasCodeOrStructuredContent("<Button onClick={handleClick}>Click</Button>")).toBe(true);
    expect(hasCodeOrStructuredContent("<img src='test.png' />")).toBe(true);
  });

  it("detects code keywords", () => {
    expect(hasCodeOrStructuredContent("const x = 1")).toBe(true);
    expect(hasCodeOrStructuredContent("function test() { return true; }")).toBe(true);
    expect(hasCodeOrStructuredContent("import React from 'react'")).toBe(true);
    expect(hasCodeOrStructuredContent("export default App")).toBe(true);
    expect(hasCodeOrStructuredContent("async function fetch() { await api.get(); }")).toBe(true);
  });

  it("detects code operators", () => {
    expect(hasCodeOrStructuredContent("a === b")).toBe(true);
    expect(hasCodeOrStructuredContent("x => x * 2")).toBe(true);
    expect(hasCodeOrStructuredContent("a && b")).toBe(true);
    expect(hasCodeOrStructuredContent("obj?.prop")).toBe(true);
  });

  it("detects JSON structure", () => {
    expect(hasCodeOrStructuredContent('{"key": "value"}')).toBe(true);
    expect(hasCodeOrStructuredContent('[1, 2, 3]')).toBe(true);
    expect(hasCodeOrStructuredContent('{ "name": "test", "count": 5 }')).toBe(true);
  });

  it("detects YAML structure", () => {
    expect(hasCodeOrStructuredContent("---\nkey: value")).toBe(true);
    expect(hasCodeOrStructuredContent("name: test\nversion: 1.0")).toBe(true);
  });

  it("detects SQL keywords", () => {
    expect(hasCodeOrStructuredContent("SELECT * FROM users")).toBe(true);
    expect(hasCodeOrStructuredContent("INSERT INTO table VALUES")).toBe(true);
    expect(hasCodeOrStructuredContent("UPDATE users SET name = 'test'")).toBe(true);
  });

  it("detects file paths", () => {
    expect(hasCodeOrStructuredContent("/usr/local/bin/node")).toBe(true);
    expect(hasCodeOrStructuredContent("~/config.json")).toBe(true);
    expect(hasCodeOrStructuredContent("C:\\Program Files\\nodejs")).toBe(true);
  });

  it("detects URLs", () => {
    expect(hasCodeOrStructuredContent("https://example.com/api")).toBe(true);
    expect(hasCodeOrStructuredContent("http://localhost:3000")).toBe(true);
  });

  it("returns false for non-code text", () => {
    expect(hasCodeOrStructuredContent("Hello world")).toBe(false);
    expect(hasCodeOrStructuredContent("This is a test sentence")).toBe(false);
    expect(hasCodeOrStructuredContent("")).toBe(false);
    expect(hasCodeOrStructuredContent(null)).toBe(false);
    expect(hasCodeOrStructuredContent(undefined)).toBe(false);
  });

  it("returns false for very short text", () => {
    expect(hasCodeOrStructuredContent("ab")).toBe(false);
    expect(hasCodeOrStructuredContent("12")).toBe(false);
  });
});

describe("shouldBlockCodeOrStructuredContentRewrite", () => {

  it("blocks when source has code but output is prose", () => {
    const source = "```typescript\nconst x = 1;\n```";
    const output = "Here is the code: you define a constant x with value 1.";
    expect(shouldBlockCodeOrStructuredContentRewrite(source, output)).toBe(true);
  });

  it("blocks when source has inline code but output removes it", () => {
    const source = "Use `npm install` to install";
    const output = "Run the installation command using npm tool.";
    expect(shouldBlockCodeOrStructuredContentRewrite(source, output)).toBe(true);
  });

  it("blocks when source has code fence but output converts to inline", () => {
    const source = "```\nfunction test() {}\n```";
    const output = "The function test() is defined.";
    expect(shouldBlockCodeOrStructuredContentRewrite(source, output)).toBe(true);
  });

  it("allows when both source and output have code", () => {
    const source = "const x = 1";
    const output = "const x = 1;";
    expect(shouldBlockCodeOrStructuredContentRewrite(source, output)).toBe(false);
  });

  it("allows when neither has code", () => {
    const source = "Hello world";
    const output = "Hello, world!";
    expect(shouldBlockCodeOrStructuredContentRewrite(source, output)).toBe(false);
  });

  it("returns false when source has no code", () => {
    const source = "This is regular text";
    const output = "This is rewritten text";
    expect(shouldBlockCodeOrStructuredContentRewrite(source, output)).toBe(false);
  });

  it("returns true when output is empty", () => {
    const source = "const x = 1";
    expect(shouldBlockCodeOrStructuredContentRewrite(source, "")).toBe(true);
    expect(shouldBlockCodeOrStructuredContentRewrite(source, null)).toBe(true);
  });
});
