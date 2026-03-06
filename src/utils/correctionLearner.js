/**
 * Extracts transcription corrections by diffing original text against
 * the edited field value. Returns corrected words to add to the custom dictionary.
 */

/** Levenshtein edit distance between two strings */
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/** Tokenize text into words, stripping punctuation from edges */
function tokenize(text) {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, ""))
    .filter((w) => w.length > 0);
}

function normalizeCandidate(value) {
  return String(value || "")
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .replace(/\s+/g, " ");
}

function sanitizeForDistance(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Extract likely dictionary terms from a token/phrase.
 * - Mixed CJK+Latin text: prefer extracting embedded terms (e.g. "你知道Antigravity吗" -> "Antigravity")
 * - Pure tokens: allow full token if concise
 */
function extractTermCandidates(value) {
  const input = normalizeCandidate(value);
  if (!input) return [];

  const hasCjk = /[\p{Script=Han}]/u.test(input);
  const hasLatin = /[A-Za-z]/.test(input);
  const candidates = new Set();

  const maybeAdd = (raw) => {
    const candidate = normalizeCandidate(raw);
    if (!candidate) return;
    if (candidate.length < 2 || candidate.length > 40) return;
    if (!/[\p{L}\p{N}]/u.test(candidate)) return;
    if (/[/@\\]/.test(candidate)) return;
    if (/[。！？!?]/u.test(candidate)) return;
    if (candidate.split(/\s+/).filter(Boolean).length > 4) return;
    if (/^[\p{Script=Han}]+$/u.test(candidate) && candidate.length > 12) return;
    candidates.add(candidate);
  };

  if (hasCjk && hasLatin) {
    // Mixed-script text is often sentence context around a term.
    // Only pull embedded Latin-like identifiers from it.
    const latinTerms = input.match(/[A-Za-z][A-Za-z0-9.+#-]{1,39}/g) || [];
    for (const term of latinTerms) {
      maybeAdd(term);
    }
  } else {
    // Pure-script text: keep the full token/phrase as the canonical correction.
    maybeAdd(input);
  }

  return Array.from(candidates);
}

/**
 * Find the region in fieldValue that corresponds to the pasted originalText.
 * If the field only contains the pasted text, returns fieldValue as-is.
 */
function findEditedRegion(originalText, fieldValue) {
  if (fieldValue.length <= originalText.length * 1.5) {
    return fieldValue;
  }

  const idx = fieldValue.indexOf(originalText);
  if (idx !== -1) {
    return originalText;
  }

  // Sliding window: find the region with highest word overlap
  const origWords = tokenize(originalText);
  const fieldWords = tokenize(fieldValue);
  const windowSize = origWords.length;

  if (fieldWords.length <= windowSize) {
    return fieldValue;
  }

  let bestStart = 0;
  let bestScore = -1;

  for (let i = 0; i <= fieldWords.length - windowSize; i++) {
    let matches = 0;
    for (let j = 0; j < windowSize; j++) {
      if (fieldWords[i + j].toLowerCase() === origWords[j].toLowerCase()) {
        matches++;
      }
    }
    if (matches > bestScore) {
      bestScore = matches;
      bestStart = i;
    }
  }

  // Require at least 30% word overlap to consider it a match
  if (bestScore < windowSize * 0.3) {
    return fieldValue;
  }

  return fieldWords.slice(bestStart, bestStart + windowSize).join(" ");
}

/**
 * Word-level LCS to find [originalWord, editedWord] substitution pairs.
 * Returns substitution pairs plus LCS length for rewrite detection.
 */
function findSubstitutions(origWords, editedWords) {
  const m = origWords.length;
  const n = editedWords.length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1].toLowerCase() === editedWords[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const aligned = [];
  let i = m,
    j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1].toLowerCase() === editedWords[j - 1].toLowerCase()) {
      aligned.unshift([origWords[i - 1], editedWords[j - 1]]);
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      aligned.unshift([null, editedWords[j - 1]]);
      j--;
    } else {
      aligned.unshift([origWords[i - 1], null]);
      i--;
    }
  }

  // Group substitutions by contiguous delete+insert blocks.
  // This handles:
  // - one-to-one: "Kimmy" -> "kimi"
  // - one-to-many: "Evan" -> "E win"
  // - many-to-one: "V R S S" -> "WeRSS"
  // - many-to-many short phrase rewrites for proper nouns
  const subs = [];
  for (let k = 0; k < aligned.length; k++) {
    const [origW, editW] = aligned[k];
    if (origW === null || editW !== null) continue;

    const deleted = [origW];
    let j = k + 1;
    while (j < aligned.length) {
      const [nextOrigW, nextEditW] = aligned[j];
      if (nextOrigW !== null && nextEditW === null) {
        deleted.push(nextOrigW);
        j++;
        continue;
      }
      break;
    }

    const inserted = [];
    while (j < aligned.length) {
      const [nextOrigW, nextEditW] = aligned[j];
      if (nextOrigW === null && nextEditW !== null) {
        inserted.push(nextEditW);
        j++;
        continue;
      }
      break;
    }

    if (deleted.length > 0 && inserted.length > 0) {
      subs.push([deleted.join(" "), inserted.join(" ")]);
      k = j - 1;
    }
  }

  return {
    substitutions: subs,
    lcsLength: dp[m][n],
  };
}

/**
 * Extract corrected words from a user's edits to pasted transcription text.
 *
 * @param {string} originalText - The text that was originally pasted (from transcription)
 * @param {string} fieldValue - The current value of the text field (after user edits)
 * @param {string[]} existingDictionary - Words already in the custom dictionary
 * @returns {string[]} Array of corrected words to add to the dictionary
 */
function extractCorrections(originalText, fieldValue, existingDictionary) {
  if (!originalText || !fieldValue) return [];
  if (originalText === fieldValue) return [];

  const editedRegion = findEditedRegion(originalText, fieldValue);
  if (editedRegion === originalText) return [];

  const origWords = tokenize(originalText);
  const editedWords = tokenize(editedRegion);

  if (origWords.length === 0 || editedWords.length === 0) return [];

  const isShortSample = Math.max(origWords.length, editedWords.length) <= 4;
  const isVeryShortSample = Math.max(origWords.length, editedWords.length) <= 2;

  const lengthDeltaRatio =
    Math.abs(editedWords.length - origWords.length) / Math.max(origWords.length, 1);
  const maxLengthDeltaRatio = isShortSample ? 1 : 0.4;
  if (lengthDeltaRatio > maxLengthDeltaRatio) return [];

  // If too much changed, treat this as a rewrite and learn nothing.
  const { substitutions: subs, lcsLength } = findSubstitutions(origWords, editedWords);
  const changedRatio = subs.length / Math.max(origWords.length, 1);
  const unchangedRatio = lcsLength / Math.max(origWords.length, editedWords.length, 1);
  const maxChangedRatio = isVeryShortSample ? 1 : isShortSample ? 0.8 : 0.35;
  // For short samples, allow zero unchanged words so acronym-style corrections
  // (e.g. "V R S S" -> "We RSS") can still be learned.
  const minUnchangedRatio = isShortSample ? 0 : 0.45;
  if (changedRatio > maxChangedRatio || unchangedRatio < minUnchangedRatio) return [];

  const safeDict = Array.isArray(existingDictionary) ? existingDictionary : [];
  const dictSet = new Set(safeDict.map((w) => w.toLowerCase()));
  const seenCorrections = new Set();
  const results = [];

  for (const [origWord, correctedWord] of subs) {
    if (!origWord || !correctedWord) continue;

    const sourceCandidates = extractTermCandidates(origWord);
    const targetCandidates = extractTermCandidates(correctedWord);
    if (targetCandidates.length === 0) continue;

    const sourceDistancePool = (sourceCandidates.length > 0 ? sourceCandidates : [origWord])
      .map((w) => sanitizeForDistance(w))
      .filter(Boolean);

    for (const candidate of targetCandidates) {
      const normalizedCandidate = candidate.toLowerCase();
      if (dictSet.has(normalizedCandidate)) continue;
      if (seenCorrections.has(normalizedCandidate)) continue;
      if (sourceCandidates.some((w) => w.toLowerCase() === normalizedCandidate)) continue;

      const distTarget = sanitizeForDistance(candidate);
      if (!distTarget) continue;

      if (sourceDistancePool.length > 0) {
        let bestRatio = Number.POSITIVE_INFINITY;

        for (const distSource of sourceDistancePool) {
          const maxLen = Math.max(distSource.length, distTarget.length);
          if (maxLen === 0) continue;
          const dist = editDistance(distSource, distTarget);
          const ratio = dist / maxLen;
          if (ratio < bestRatio) bestRatio = ratio;
        }

        const maxLen = Math.max(
          ...sourceDistancePool.map((s) => Math.max(s.length, distTarget.length))
        );
        const maxDistanceRatio = maxLen <= 4 ? 0.5 : 0.65;
        if (bestRatio > maxDistanceRatio) continue;
      }

      results.push(candidate);
      seenCorrections.add(normalizedCandidate);
    }
  }

  return results;
}

module.exports = { extractCorrections };
