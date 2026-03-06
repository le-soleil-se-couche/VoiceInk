const HARD_DELIMITERS = new Set([",", ";", "\n", "\r", "\t"]);

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function parseDictionaryInput(text: string, existingWords: Iterable<string> = []): string[] {
  if (!text) return [];

  const seen = new Set<string>();
  const parsedWords: string[] = [];

  for (const existingWord of existingWords) {
    const normalized = normalizeToken(existingWord);
    if (normalized) {
      seen.add(normalized.toLowerCase());
    }
  }

  let currentToken = "";
  let activeQuote: "'" | '"' | null = null;

  const commitToken = () => {
    const normalized = normalizeToken(currentToken);
    currentToken = "";

    if (!normalized) return;

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) return;

    seen.add(dedupeKey);
    parsedWords.push(normalized);
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (activeQuote) {
      if (char === activeQuote) {
        activeQuote = null;
      } else {
        currentToken += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      activeQuote = char;
      continue;
    }

    if (HARD_DELIMITERS.has(char)) {
      commitToken();
      continue;
    }

    if (char === " ") {
      let spaceRunLength = 1;
      while (i + 1 < text.length && text[i + 1] === " ") {
        spaceRunLength += 1;
        i += 1;
      }

      if (spaceRunLength >= 2) {
        commitToken();
      } else {
        currentToken += " ";
      }
      continue;
    }

    currentToken += char;
  }

  commitToken();

  return parsedWords;
}
