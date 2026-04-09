import type { TargetAppInfo } from "../types/electron";
export const DEFAULT_STRICT_OVERLAP_THRESHOLD = 0.45;

export type ReasoningContext = "general" | "code" | "email" | "chat" | "document";
export type ReasoningIntent = "cleanup" | "instruction";

export interface ContextClassification {
  context: ReasoningContext;
  intent: ReasoningIntent;
  confidence: number;
  strictMode: boolean;
  strictOverlapThreshold: number;
  signals: string[];
  targetApp: TargetAppInfo;
}

const APP_CONTEXT_RULES: Array<{ context: ReasoningContext; re: RegExp; signal: string }> = [
  { context: "code", re: /(code|cursor|vscode|visual studio|terminal|powershell|iterm|xcode)/i, signal: "app:code" },
  { context: "email", re: /(mail|gmail|outlook|spark|thunderbird)/i, signal: "app:email" },
  { context: "chat", re: /(slack|discord|teams|wechat|telegram|whatsapp|message)/i, signal: "app:chat" },
  { context: "document", re: /(notion|docs|word|pages|onenote|obsidian)/i, signal: "app:document" },
];

const CONTENT_CONTEXT_RULES: Array<{ context: ReasoningContext; re: RegExp; signal: string }> = [
  {
    context: "code",
    re: /(```|<\/?[a-z][^>]*>|=>|\bfunction\b|\bconst\b|\bclass\b|\bimport\b|\breturn\b)/i,
    signal: "text:code",
  },
  {
    context: "code",
    re: /(^|[\s(])(?:npm|pnpm|yarn|bun|npx|node|deno|python|python3|pip|pip3|uv|poetry|cargo|go|git|gh|docker|kubectl|helm|make|cmake|brew)\b/i,
    signal: "text:code_cli",
  },
  {
    context: "code",
    re: /(?:^|[\s(])(?:\.{1,2}\/[\w./-]+|(?:[\w.-]+\/)+[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|py|go|rs|java|rb|sh|yaml|yml|toml|sql)|\/(?:[\w.-]+\/)+[\w.-]+|@[\w.-]+\/[\w.-]+|[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|py|go|rs|java|rb|sh|yaml|yml|toml|sql))\b/i,
    signal: "text:code_artifact",
  },
  {
    context: "email",
    re: /(^|\n)\s*(subject:|dear\s+|hi\s+\w+|best regards|sincerely|thanks,)/i,
    signal: "text:email",
  },
  {
    context: "chat",
    re: /(^|\s)(hey|yo|lol|btw|asap|fyi|ping)\b/i,
    signal: "text:chat",
  },
  {
    context: "document",
    re: /(^|\n)\s*(-|\*|\d+\.)\s+\S+|(^|\n)\s*agenda[:\s]|(^|\n)\s*summary[:\s]/i,
    signal: "text:document",
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseStrictThreshold = (): number => {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_STRICT_OVERLAP_THRESHOLD;
  }

  const raw = window.localStorage.getItem("reasoningStrictOverlapThreshold");
  if (!raw) {
    return DEFAULT_STRICT_OVERLAP_THRESHOLD;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_STRICT_OVERLAP_THRESHOLD;
  }

  return clamp(parsed, 0.4, 0.95);
};

const readStrictMode = (): boolean => {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }

  const raw = window.localStorage.getItem("reasoningStrictMode");
  if (raw === null) {
    return true;
  }

  return raw !== "false";
};

const detectInstructionIntent = (text: string, agentName: string | null, signals: string[]) => {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (agentName) {
    const escapedName = escapeRegExp(agentName.trim());
    if (escapedName) {
      const directAddress = new RegExp(
        `^(?:hey|hi|ok|okay)?\\s*${escapedName}(?:\\s*[:,]\\s*|\\s+)(?:please\\s+)?`,
        "i"
      );
      if (directAddress.test(trimmed)) {
        signals.push("intent:agent_direct_address");
        return true;
      }
    }
  }

  return false;
};

const detectContextFromRules = (
  rules: Array<{ context: ReasoningContext; re: RegExp; signal: string }>,
  sourceText: string,
  signals: string[]
) => {
  for (const rule of rules) {
    if (rule.re.test(sourceText)) {
      signals.push(rule.signal);
      return rule.context;
    }
  }
  return null;
};

export async function getTargetAppInfo(): Promise<TargetAppInfo> {
  const fallback: TargetAppInfo = {
    appName: null,
    processId: null,
    platform: typeof window !== "undefined" ? window.electronAPI?.getPlatform?.() || "unknown" : "unknown",
    source: "renderer-fallback",
    capturedAt: null,
  };

  if (typeof window === "undefined" || !window.electronAPI?.getTargetAppInfo) {
    return fallback;
  }

  try {
    const info = await window.electronAPI.getTargetAppInfo();
    if (!info || typeof info !== "object") {
      return fallback;
    }

    return {
      appName: typeof info.appName === "string" && info.appName.trim() ? info.appName.trim() : null,
      processId: Number.isInteger(info.processId) ? info.processId : null,
      platform: typeof info.platform === "string" && info.platform ? info.platform : fallback.platform,
      source: info.source === "main-process" ? "main-process" : "renderer-fallback",
      capturedAt: typeof info.capturedAt === "string" && info.capturedAt ? info.capturedAt : null,
    };
  } catch {
    return fallback;
  }
}

export function classifyContext({
  text,
  targetApp,
  agentName,
}: {
  text: string;
  targetApp: TargetAppInfo;
  agentName?: string | null;
}): ContextClassification {
  const normalizedText = typeof text === "string" ? text : "";
  const signals: string[] = [];

  const appName = targetApp.appName || "";
  const appContext = detectContextFromRules(APP_CONTEXT_RULES, appName, signals);
  const contentContext = detectContextFromRules(CONTENT_CONTEXT_RULES, normalizedText, signals);
  const context = contentContext || appContext || "general";

  const isInstruction = detectInstructionIntent(normalizedText, agentName || null, signals);
  const intent: ReasoningIntent = isInstruction ? "instruction" : "cleanup";

  let confidence = 0.55;
  if (appContext) confidence += 0.2;
  if (contentContext) confidence += 0.2;
  if (intent === "instruction") confidence += 0.05;
  confidence = Number(clamp(confidence, 0.5, 0.99).toFixed(2));

  const strictModeEnabled = readStrictMode() && intent === "cleanup";

  return {
    context,
    intent,
    confidence,
    strictMode: strictModeEnabled,
    strictOverlapThreshold: parseStrictThreshold(),
    signals,
    targetApp,
  };
}
