import { describe, expect, it } from "vitest";
import AudioManager from "../audioManager";

const cleanup = (input: string) => AudioManager.prototype.basicDictationCleanup.call({}, input);

describe("AudioManager basicDictationCleanup", () => {
  it("collapses repeated short English fragment false starts with ASCII comma", () => {
    expect(cleanup("we should, we should ship today")).toBe("we should ship today");
  });

  it("collapses repeated short English fragment false starts with ideographic comma", () => {
    expect(cleanup("we should、we should ship today")).toBe("we should ship today");
  });

  it("collapses repeated short English fragment false starts without punctuation", () => {
    expect(cleanup("i think i think we should wait")).toBe("i think we should wait");
  });

  it("keeps content-led lexical repetition", () => {
    expect(cleanup("very good very good point")).toBe("very good very good point");
  });

  it("removes sentence-initial discourse filler Like without punctuation", () => {
    expect(cleanup("Like we should ship today")).toBe("we should ship today");
  });

  it("removes sentence-initial discourse filler like before modal question without punctuation", () => {
    expect(cleanup("like can we ship today")).toBe("can we ship today");
  });

  it("removes sentence-initial discourse filler like before imperative please without punctuation", () => {
    expect(cleanup("like please send the update today")).toBe("please send the update today");
  });

  it("removes sentence-initial discourse filler like before let's action lead-in without punctuation", () => {
    expect(cleanup("like let's send the update today")).toBe("let's send the update today");
  });

  it("keeps lexical sentence-initial like + demonstrative phrasing", () => {
    expect(cleanup("Like this design, we should ship today")).toBe("Like this design, we should ship today");
  });

  it("keeps lexical sentence-initial like clause phrasing", () => {
    expect(cleanup("Like we discussed yesterday, we should ship today")).toBe(
      "Like we discussed yesterday, we should ship today"
    );
  });

  it("removes sentence-initial discourse filler you know without punctuation", () => {
    expect(cleanup("you know we should ship today")).toBe("we should ship today");
  });

  it("removes sentence-initial discourse filler you know before modal question without punctuation", () => {
    expect(cleanup("you know can we ship today")).toBe("can we ship today");
  });

  it("removes sentence-initial discourse filler you know before imperative please without punctuation", () => {
    expect(cleanup("you know please send the update today")).toBe("please send the update today");
  });

  it("removes sentence-initial discourse filler you know before let's action lead-in without punctuation", () => {
    expect(cleanup("you know let's ship today")).toBe("let's ship today");
  });

  it("keeps lexical sentence-initial you know + Let's Encrypt phrasing", () => {
    expect(cleanup("You know Let's Encrypt certificates expire annually")).toBe(
      "You know Let's Encrypt certificates expire annually"
    );
  });

  it("keeps lexical sentence-initial you know that usage", () => {
    expect(cleanup("You know that we should ship today")).toBe("You know that we should ship today");
  });

  it("keeps lexical sentence-initial you know clause phrasing", () => {
    expect(cleanup("You know we discussed this yesterday")).toBe("You know we discussed this yesterday");
  });

  it("removes sentence-initial discourse filler I mean without punctuation", () => {
    expect(cleanup("I mean we should ship today")).toBe("we should ship today");
  });

  it("removes sentence-initial discourse filler i mean before modal question without punctuation", () => {
    expect(cleanup("i mean can we ship today")).toBe("can we ship today");
  });

  it("removes sentence-initial discourse filler i mean before imperative please without punctuation", () => {
    expect(cleanup("i mean please send the update today")).toBe("please send the update today");
  });

  it("removes sentence-initial discourse filler i mean before let's action lead-in without punctuation", () => {
    expect(cleanup("i mean let's review this section")).toBe("let's review this section");
  });

  it("keeps lexical sentence-initial i mean usage", () => {
    expect(cleanup("I mean this design, not that one")).toBe("I mean this design, not that one");
  });

  it("removes sentence-initial discourse filler basically without punctuation", () => {
    expect(cleanup("basically we should ship today")).toBe("we should ship today");
  });

  it("removes sentence-initial discourse filler Basically before modal question without punctuation", () => {
    expect(cleanup("Basically can we ship today")).toBe("can we ship today");
  });

  it("removes sentence-initial discourse filler basically before imperative please without punctuation", () => {
    expect(cleanup("basically please send the update today")).toBe("please send the update today");
  });

  it("removes sentence-initial discourse filler basically before let's action lead-in without punctuation", () => {
    expect(cleanup("basically let's proceed with the launch")).toBe("let's proceed with the launch");
  });

  it("keeps lexical sentence-initial basically usage", () => {
    expect(cleanup("Basically this is the final draft")).toBe("Basically this is the final draft");
  });

  it("removes sentence-initial discourse filler well without punctuation", () => {
    expect(cleanup("well we should ship today")).toBe("we should ship today");
  });

  it("removes sentence-initial discourse filler Well before modal question without punctuation", () => {
    expect(cleanup("Well can we ship today")).toBe("can we ship today");
  });

  it("removes sentence-initial discourse filler well before imperative please without punctuation", () => {
    expect(cleanup("well please send the update today")).toBe("please send the update today");
  });

  it("removes sentence-initial discourse filler well before let's action lead-in without punctuation", () => {
    expect(cleanup("well let's review this section")).toBe("let's review this section");
  });

  it("keeps lexical sentence-initial well usage", () => {
    expect(cleanup("Well this is the final draft")).toBe("Well this is the final draft");
  });

  it("keeps lexical adverb well in-clause usage", () => {
    expect(cleanup("that works well for today")).toBe("that works well for today");
  });

  it("removes sentence-initial discourse filler mm", () => {
    expect(cleanup("mm, send update today")).toBe("send update today");
  });

  it("removes comma-led one-sided hesitation filler mm in English", () => {
    expect(cleanup("we should, mm ship today")).toBe("we should ship today");
  });

  it("removes comma-led one-sided hesitation filler Mm with full-width comma", () => {
    expect(cleanup("we should，Mm ship today")).toBe("we should ship today");
  });

  it("removes comma-led one-sided hesitation filler mm with ideographic comma", () => {
    expect(cleanup("we should、mm ship today")).toBe("we should ship today");
  });

  it("removes comma-led hesitation filler without closing comma in English", () => {
    expect(cleanup("we should, um ship today")).toBe("we should ship today");
  });

  it("removes comma-led hesitation filler without closing comma in mixed punctuation", () => {
    expect(cleanup("we should，uh ship today")).toBe("we should ship today");
  });

  it("removes comma-led hesitation filler without closing comma in Chinese", () => {
    expect(cleanup("我们，呃 今天发版")).toBe("我们今天发版");
  });

  it("removes comma-led one-sided discourse filler you know", () => {
    expect(cleanup("we should, you know ship today")).toBe("we should ship today");
  });

  it("removes comma-led one-sided discourse filler like with full-width comma", () => {
    expect(cleanup("we should，like ship today")).toBe("we should ship today");
  });

  it("removes comma-led one-sided discourse filler i mean with ideographic comma", () => {
    expect(cleanup("we should、i mean ship today")).toBe("we should ship today");
  });

  it("removes comma-led one-sided discourse filler basically", () => {
    expect(cleanup("we should, basically ship today")).toBe("we should ship today");
  });

  it("keeps lexical comma-led you know that clause", () => {
    expect(cleanup("And, you know that we should ship today")).toBe(
      "And, you know that we should ship today"
    );
  });

  it("keeps lexical comma-led like demonstrative phrase", () => {
    expect(cleanup("Review this, like this example template")).toBe(
      "Review this, like this example template"
    );
  });

  it("keeps lexical comma-led i mean demonstrative phrase", () => {
    expect(cleanup("Review this, i mean this exact section")).toBe(
      "Review this, i mean this exact section"
    );
  });

  it("keeps lexical comma-led basically demonstrative phrase", () => {
    expect(cleanup("Review this, basically this exact section")).toBe(
      "Review this, basically this exact section"
    );
  });

  it("keeps lexical uppercase ER in comma-led context", () => {
    expect(cleanup("triage, ER staff will assist")).toBe("triage, ER staff will assist");
  });

  it("removes sentence-initial discourse filler mm without punctuation", () => {
    expect(cleanup("mm we should ship today")).toBe("we should ship today");
  });

  it("removes sentence-initial discourse filler Mm without punctuation", () => {
    expect(cleanup("Mm we should ship today")).toBe("we should ship today");
  });

  it("removes parenthetical discourse filler mm without leaving comma artifacts", () => {
    expect(cleanup("we should, mm, ship today")).toBe("we should ship today");
  });

  it("removes comma-appended sentence-final discourse filler mm", () => {
    expect(cleanup("we should ship today, mm")).toBe("we should ship today");
  });

  it("keeps lexical measurement mm", () => {
    expect(cleanup("use a 5 mm drill bit")).toBe("use a 5 mm drill bit");
  });

  it("keeps uppercase lexical acronym HMM", () => {
    expect(cleanup("HMM migration is blocked")).toBe("HMM migration is blocked");
  });

  it("keeps uppercase lexical token MM", () => {
    expect(cleanup("MM migration is blocked")).toBe("MM migration is blocked");
  });

  it("keeps uppercase lexical token MM in comma-led context", () => {
    expect(cleanup("rollout, MM module is blocked")).toBe("rollout, MM module is blocked");
  });

  it("keeps uppercase lexical acronym ER", () => {
    expect(cleanup("should we go to ER now")).toBe("should we go to ER now");
  });

  it("still removes lowercase hesitation filler hmm", () => {
    expect(cleanup("hmm we should ship today")).toBe("we should ship today");
  });
});
