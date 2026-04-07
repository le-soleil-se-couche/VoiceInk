import { describe, expect, it } from "vitest";
import AudioManager from "../audioManager";

const basicDictationCleanup = (input: string) =>
  AudioManager.prototype.basicDictationCleanup.call({}, input);

describe("AudioManager basicDictationCleanup", () => {
  it("preserves uppercase ER abbreviation in lexical medical context", () => {
    expect(basicDictationCleanup("should we go to ER now")).toBe("should we go to ER now");
  });

  it("still removes lowercase er hesitation filler", () => {
    expect(basicDictationCleanup("er, we should ship today")).toBe("we should ship today");
  });

  it("preserves lexical measurement unit mm in numeric context", () => {
    expect(basicDictationCleanup("use a 5 mm drill bit")).toBe("use a 5 mm drill bit");
  });

  it("preserves lexical battery-capacity Ah unit in numeric context", () => {
    expect(basicDictationCleanup("bring a 5 Ah battery pack")).toBe("bring a 5 Ah battery pack");
  });

  it("still removes sentence-initial mm hesitation filler", () => {
    expect(basicDictationCleanup("mm, we should ship today")).toBe("we should ship today");
  });

  it("still removes sentence-initial ah hesitation filler", () => {
    expect(basicDictationCleanup("ah, we should ship today")).toBe("we should ship today");
  });

  it("removes comma-led english hesitation filler without closing comma", () => {
    expect(basicDictationCleanup("we should, um ship today")).toBe("we should ship today");
  });

  it("removes comma-led chinese hesitation filler without closing comma", () => {
    expect(basicDictationCleanup("我们，呃 今天发版")).toBe("我们今天发版");
  });

  it("preserves lexical words that begin with filler syllables after commas", () => {
    expect(basicDictationCleanup("we should, error handling is fine")).toBe(
      "we should, error handling is fine"
    );
    expect(basicDictationCleanup("we should, umbrella plan works")).toBe(
      "we should, umbrella plan works"
    );
  });

  it("removes parenthetical um filler without leaving comma artifacts", () => {
    expect(basicDictationCleanup("we should, um, ship today")).toBe("we should ship today");
  });

  it("preserves all-caps technical acronyms that collide with filler patterns", () => {
    expect(basicDictationCleanup("HMM model works")).toBe("HMM model works");
  });

  it("still removes lowercase hesitation fillers", () => {
    expect(basicDictationCleanup("hmm model works")).toBe("model works");
  });

  it("preserves lexical as-you-know phrase", () => {
    expect(basicDictationCleanup("as you know we should ship today")).toBe(
      "as you know we should ship today"
    );
  });

  it("preserves sentence-initial lexical you-know-that clause", () => {
    expect(basicDictationCleanup("You know that we should ship today")).toBe(
      "You know that we should ship today"
    );
  });

  it("preserves lexical let-you-know phrase", () => {
    expect(basicDictationCleanup("I'll let you know tomorrow")).toBe("I'll let you know tomorrow");
  });

  it("preserves lexical make-sure-you-know directive phrase", () => {
    expect(basicDictationCleanup("make sure you know the rollback steps")).toBe(
      "make sure you know the rollback steps"
    );
  });

  it("preserves lexical ensure-you-know directive phrase", () => {
    expect(basicDictationCleanup("ensure you know the risks")).toBe("ensure you know the risks");
  });

  it("preserves interrogative do-you-know phrase", () => {
    expect(basicDictationCleanup("do you know where the file is")).toBe(
      "do you know where the file is"
    );
  });

  it("preserves interrogative did-you-know phrase", () => {
    expect(basicDictationCleanup("did you know we should ship today")).toBe(
      "did you know we should ship today"
    );
  });

  it("preserves contracted interrogative don't-you-know phrase", () => {
    expect(basicDictationCleanup("don't you know where the file is")).toBe(
      "don't you know where the file is"
    );
  });

  it("preserves contracted interrogative didn't-you-know phrase", () => {
    expect(basicDictationCleanup("didn't you know we already shipped")).toBe(
      "didn't you know we already shipped"
    );
  });

  it("preserves lexical if-you-know clause", () => {
    expect(basicDictationCleanup("if you know the answer tell me")).toBe(
      "if you know the answer tell me"
    );
  });

  it("preserves lexical unless-you-know clause", () => {
    expect(basicDictationCleanup("unless you know the password you cannot login")).toBe(
      "unless you know the password you cannot login"
    );
  });

  it("preserves lexical that-you-know relative clause", () => {
    expect(basicDictationCleanup("share that you know about the outage")).toBe(
      "share that you know about the outage"
    );
  });

  it("preserves lexical i-know-you-know clause", () => {
    expect(basicDictationCleanup("I know you know the plan")).toBe("I know you know the plan");
  });

  it("preserves lexical we-know-you-know clause", () => {
    expect(basicDictationCleanup("we know you know this already")).toBe(
      "we know you know this already"
    );
  });

  it("preserves lexical what-you-know relative clause", () => {
    expect(basicDictationCleanup("tell me what you know about this")).toBe(
      "tell me what you know about this"
    );
  });

  it("preserves lexical how-you-know relative clause", () => {
    expect(basicDictationCleanup("tell me how you know this")).toBe(
      "tell me how you know this"
    );
  });

  it("preserves lexical whether-you-know clause", () => {
    expect(basicDictationCleanup("tell me whether you know the answer")).toBe(
      "tell me whether you know the answer"
    );
  });

  it("preserves lexical who-you-know clause", () => {
    expect(basicDictationCleanup("tell me who you know at the company")).toBe(
      "tell me who you know at the company"
    );
  });

  it("preserves lexical which-you-know clause", () => {
    expect(basicDictationCleanup("share which you know is stable")).toBe(
      "share which you know is stable"
    );
  });

  it("preserves lexical whatever-you-know clause", () => {
    expect(basicDictationCleanup("tell me whatever you know about this")).toBe(
      "tell me whatever you know about this"
    );
  });

  it("preserves lexical whoever-you-know clause", () => {
    expect(basicDictationCleanup("show me whoever you know at the company")).toBe(
      "show me whoever you know at the company"
    );
  });

  it("preserves lexical whichever-you-know clause", () => {
    expect(basicDictationCleanup("share whichever you know is stable")).toBe(
      "share whichever you know is stable"
    );
  });

  it("preserves lexical whenever-you-know clause", () => {
    expect(basicDictationCleanup("tell me whenever you know the timeline")).toBe(
      "tell me whenever you know the timeline"
    );
  });

  it("preserves lexical wherever-you-know clause", () => {
    expect(basicDictationCleanup("tell me wherever you know we can host")).toBe(
      "tell me wherever you know we can host"
    );
  });

  it("preserves lexical whom-you-know clause", () => {
    expect(basicDictationCleanup("tell me whom you know at the company")).toBe(
      "tell me whom you know at the company"
    );
  });

  it("preserves lexical when-you-know clause", () => {
    expect(basicDictationCleanup("explain when you know the answer")).toBe(
      "explain when you know the answer"
    );
  });

  it("preserves lexical where-you-know clause", () => {
    expect(basicDictationCleanup("tell me where you know this from")).toBe(
      "tell me where you know this from"
    );
  });

  it("preserves lexical why-you-know clause", () => {
    expect(basicDictationCleanup("explain why you know this")).toBe("explain why you know this");
  });

  it("preserves lexical everything-you-know object clause", () => {
    expect(basicDictationCleanup("tell me everything you know about this")).toBe(
      "tell me everything you know about this"
    );
  });

  it("preserves lexical anything-you-know object clause", () => {
    expect(basicDictationCleanup("share anything you know about the outage")).toBe(
      "share anything you know about the outage"
    );
  });

  it("still removes sentence-initial you-know hesitation filler", () => {
    expect(basicDictationCleanup("you know we should ship today")).toBe("we should ship today");
  });

  it("removes parenthetical you-know filler without leaving comma artifacts", () => {
    expect(basicDictationCleanup("we should, you know, ship today")).toBe("we should ship today");
  });

  it("preserves content-bearing basically without comma-marked filler punctuation", () => {
    expect(basicDictationCleanup("basically impossible to reproduce")).toBe(
      "basically impossible to reproduce"
    );
  });

  it("still removes comma-marked basically hesitation filler", () => {
    expect(basicDictationCleanup("basically, we should ship today")).toBe("we should ship today");
  });

  it("removes parenthetical basically filler without leaving comma artifacts", () => {
    expect(basicDictationCleanup("we should, basically, ship today")).toBe("we should ship today");
  });

  it("preserves lexical commas when no filler is removed", () => {
    expect(basicDictationCleanup("please review, then ship today")).toBe(
      "please review, then ship today"
    );
  });
});
