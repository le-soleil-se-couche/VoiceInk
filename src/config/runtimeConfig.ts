type RuntimeConfig = {
  apiUrl: string;
  authUrl: string;
  oauthProtocol: string;
  oauthAuthBridgeUrl: string;
  oauthCallbackUrl: string;
};

const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};

const readRendererRuntimeConfig = (): RuntimeConfig => {
  const preloadConfig =
    typeof window !== "undefined" ? window.electronAPI?.runtimeConfig : undefined;

  return {
    apiUrl: (preloadConfig?.apiUrl || env.VITE_OPENWHISPR_API_URL || "").trim(),
    authUrl: (preloadConfig?.authUrl || env.VITE_NEON_AUTH_URL || "").trim(),
    oauthProtocol: (preloadConfig?.oauthProtocol || env.VITE_OPENWHISPR_PROTOCOL || "").trim(),
    oauthAuthBridgeUrl: (
      preloadConfig?.oauthAuthBridgeUrl ||
      env.VITE_OPENWHISPR_AUTH_BRIDGE_URL ||
      ""
    ).trim(),
    oauthCallbackUrl: (
      preloadConfig?.oauthCallbackUrl ||
      env.VITE_OPENWHISPR_OAUTH_CALLBACK_URL ||
      ""
    ).trim(),
  };
};

export const RUNTIME_CONFIG = readRendererRuntimeConfig();
