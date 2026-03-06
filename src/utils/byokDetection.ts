const hasValue = (value?: string | null) => Boolean(value && value.trim());

export const hasAnyByokKey = (
  values: Array<string | null | undefined>
) => values.some(hasValue);

export const hasStoredByokKey = () => {
  if (typeof localStorage === "undefined") {
    return false;
  }

  return hasAnyByokKey([
    localStorage.getItem("openaiApiKey"),
    localStorage.getItem("groqApiKey"),
    localStorage.getItem("mistralApiKey"),
    localStorage.getItem("customTranscriptionApiKey"),
  ]);
};
