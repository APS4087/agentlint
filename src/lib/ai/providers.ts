// Multi-provider, browser-side AI adapters (BYOK).
//
// Each user brings their own key; the call goes directly from the browser to
// the chosen provider. Nothing transits an AgentLint server. We use plain
// fetch (no SDKs) so the bundle stays small and every provider is handled the
// same way: build request → POST → parse text out.

export type ProviderId = "anthropic" | "openai" | "gemini" | "custom";

/** A model suggestion: the API id plus a short capability/cost hint. */
export interface ModelOption {
  id: string;
  label: string;
}

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  /** Sensible default model id. */
  defaultModel: string;
  /** Suggestions shown in a datalist; the field stays free-text. */
  models: ModelOption[];
  /** Where to get a key (shown as a hint). */
  keyHint: string;
  /** Custom/local providers need a base URL. */
  needsBaseUrl?: boolean;
  baseUrlPlaceholder?: string;
}

// Model lists current as of June 2026. The field stays free-text, so a user can
// always type a newer id; these are just the curated, known-good suggestions.
export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    defaultModel: "claude-sonnet-4-6",
    models: [
      { id: "claude-opus-4-8", label: "Opus 4.8 — most capable" },
      { id: "claude-sonnet-4-6", label: "Sonnet 4.6 — balanced" },
      { id: "claude-haiku-4-5", label: "Haiku 4.5 — fastest, cheapest" },
    ],
    keyHint: "console.anthropic.com → API keys (sk-ant-…)",
  },
  openai: {
    id: "openai",
    label: "OpenAI (GPT)",
    defaultModel: "gpt-5.4-mini",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5 — most capable" },
      { id: "gpt-5.4", label: "GPT-5.4 — strong, cheaper" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 mini — fast & cheap" },
      { id: "gpt-5.4-nano", label: "GPT-5.4 nano — fastest, cheapest" },
      { id: "gpt-4o-mini", label: "GPT-4o mini — legacy, low cost" },
    ],
    keyHint: "platform.openai.com → API keys (sk-…)",
  },
  gemini: {
    id: "gemini",
    label: "Google (Gemini)",
    defaultModel: "gemini-2.5-flash",
    models: [
      { id: "gemini-3.5-flash", label: "3.5 Flash — newest, frontier" },
      { id: "gemini-2.5-pro", label: "2.5 Pro — most capable (stable)" },
      { id: "gemini-2.5-flash", label: "2.5 Flash — balanced, free tier" },
      { id: "gemini-2.5-flash-lite", label: "2.5 Flash-Lite — fastest, cheapest" },
      { id: "gemini-3.1-flash-lite", label: "3.1 Flash-Lite — fast & budget" },
    ],
    keyHint: "aistudio.google.com → Get API key (free tier available)",
  },
  custom: {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    defaultModel: "",
    models: [
      { id: "llama3.3", label: "Llama 3.3 (Ollama)" },
      { id: "qwen2.5", label: "Qwen 2.5 (Ollama)" },
      { id: "deepseek-r1", label: "DeepSeek-R1 (Ollama)" },
      { id: "mistral", label: "Mistral (Ollama)" },
    ],
    keyHint: "Any OpenAI-compatible server: Ollama, LM Studio, OpenRouter, vLLM…",
    needsBaseUrl: true,
    baseUrlPlaceholder: "http://localhost:11434/v1",
  },
};

export const PROVIDER_ORDER: ProviderId[] = [
  "anthropic",
  "openai",
  "gemini",
  "custom",
];

export interface AnalyzeArgs {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
  system: string;
  user: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export class AIRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIRequestError";
  }
}

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "");

const extractApiError = async (res: Response): Promise<string> => {
  let detail = "";
  try {
    const data = await res.json();
    detail =
      data?.error?.message ??
      data?.error?.toString?.() ??
      data?.message ??
      "";
  } catch {
    // ignore non-JSON error bodies
  }
  if (res.status === 401 || res.status === 403) {
    return `Authentication failed (${res.status}). Check your API key.${detail ? ` ${detail}` : ""}`;
  }
  if (res.status === 429) {
    return "Rate limited by the provider. Try again shortly.";
  }
  return `Provider returned ${res.status}.${detail ? ` ${detail}` : ""}`;
};

// --- Anthropic ----------------------------------------------------------------

const callAnthropic = async (a: AnalyzeArgs): Promise<string> => {
  const base = trimTrailingSlash(a.baseUrl || "https://api.anthropic.com");
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    signal: a.signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": a.apiKey,
      "anthropic-version": "2023-06-01",
      // Required to call the API directly from a browser.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: a.model,
      max_tokens: a.maxTokens ?? 1024,
      system: a.system,
      messages: [{ role: "user", content: a.user }],
    }),
  });
  if (!res.ok) throw new AIRequestError(await extractApiError(res));
  const data = await res.json();
  const text = (data?.content ?? [])
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b.text ?? "")
    .join("")
    .trim();
  return text;
};

// --- OpenAI & OpenAI-compatible (custom) -------------------------------------

const callOpenAICompatible = async (
  a: AnalyzeArgs,
  defaultBase: string,
  // GPT-5-era OpenAI models renamed max_tokens → max_completion_tokens on the
  // Chat Completions API. Local/compatible servers (Ollama, LM Studio, vLLM,
  // OpenRouter) still expect the classic max_tokens, so the caller picks.
  tokenParam: "max_tokens" | "max_completion_tokens" = "max_tokens",
): Promise<string> => {
  const base = trimTrailingSlash(a.baseUrl || defaultBase);
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal: a.signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${a.apiKey}`,
    },
    body: JSON.stringify({
      model: a.model,
      [tokenParam]: a.maxTokens ?? 1024,
      messages: [
        { role: "system", content: a.system },
        { role: "user", content: a.user },
      ],
    }),
  });
  if (!res.ok) throw new AIRequestError(await extractApiError(res));
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
};

// --- Gemini -------------------------------------------------------------------

const callGemini = async (a: AnalyzeArgs): Promise<string> => {
  const base = trimTrailingSlash(
    a.baseUrl || "https://generativelanguage.googleapis.com",
  );
  const url = `${base}/v1beta/models/${encodeURIComponent(
    a.model,
  )}:generateContent?key=${encodeURIComponent(a.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    signal: a.signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: a.system }] },
      contents: [{ role: "user", parts: [{ text: a.user }] }],
      generationConfig: { maxOutputTokens: a.maxTokens ?? 1024 },
    }),
  });
  if (!res.ok) throw new AIRequestError(await extractApiError(res));
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
};

/** Run the analysis against the selected provider. Throws AIRequestError. */
export const analyze = async (a: AnalyzeArgs): Promise<string> => {
  let text: string;
  switch (a.provider) {
    case "anthropic":
      text = await callAnthropic(a);
      break;
    case "openai":
      text = await callOpenAICompatible(
        a,
        "https://api.openai.com/v1",
        "max_completion_tokens",
      );
      break;
    case "custom":
      if (!a.baseUrl)
        throw new AIRequestError("A base URL is required for a custom provider.");
      text = await callOpenAICompatible(a, a.baseUrl);
      break;
    case "gemini":
      text = await callGemini(a);
      break;
    default:
      throw new AIRequestError("Unknown provider.");
  }
  if (!text) throw new AIRequestError("The model returned an empty response.");
  return text;
};
