"use client";

import { useState } from "react";

import { ModelSelect } from "@/components/scan/ModelSelect";
import type { AISettings } from "@/lib/ai/useAISettings";
import {
  PROVIDER_ORDER,
  PROVIDERS,
  type ProviderId,
} from "@/lib/ai/providers";

export const AISettingsForm = ({
  initial,
  onSave,
  onCancel,
}: {
  initial: AISettings | null;
  onSave: (s: AISettings) => void;
  onCancel?: () => void;
}) => {
  const [provider, setProvider] = useState<ProviderId>(
    initial?.provider ?? "anthropic",
  );
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [model, setModel] = useState(
    initial?.model ?? PROVIDERS[initial?.provider ?? "anthropic"].defaultModel,
  );
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  const [showKey, setShowKey] = useState(false);

  const meta = PROVIDERS[provider];

  // "Custom model id" mode: on when the current model isn't a known suggestion
  // (e.g. a hand-typed id, or any model on a custom/local server).
  const isKnownModel = (id: ProviderId, m: string) =>
    PROVIDERS[id].models.some((opt) => opt.id === m);
  const [customModel, setCustomModel] = useState(
    !isKnownModel(provider, model),
  );

  const onProviderChange = (id: ProviderId) => {
    setProvider(id);
    // Reset model to the new provider's default unless the user already typed one.
    const nextModel = PROVIDERS[id].defaultModel;
    setModel(nextModel);
    setCustomModel(!isKnownModel(id, nextModel));
    if (!PROVIDERS[id].needsBaseUrl) setBaseUrl("");
  };

  const canSave =
    apiKey.trim().length > 0 &&
    model.trim().length > 0 &&
    (!meta.needsBaseUrl || baseUrl.trim().length > 0);

  const submit = () => {
    if (!canSave) return;
    onSave({
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Connect any AI provider with your own key. The key is stored only in
        this browser ({" "}
        <code className="font-mono text-xs text-ink">localStorage</code>) and
        sent only to the provider you choose — never to AgentLint.
      </p>

      {/* Provider */}
      <div>
        <span className="label">Provider</span>
        <div className="mt-1.5 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {PROVIDER_ORDER.map((id) => {
            const active = id === provider;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onProviderChange(id)}
                className="bg-surface px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.08em] transition-colors"
                style={{
                  backgroundColor: active
                    ? "var(--color-ink)"
                    : "var(--color-surface)",
                  color: active ? "var(--color-paper)" : "var(--color-ink-soft)",
                }}
                aria-pressed={active}
              >
                {PROVIDERS[id].label.split(" ")[0]}
              </button>
            );
          })}
        </div>
        <p className="mt-1 font-mono text-[10px] text-ink-faint">
          {meta.keyHint}
        </p>
      </div>

      {/* Base URL (custom only) */}
      {meta.needsBaseUrl && (
        <label className="block">
          <span className="label">Base URL</span>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={meta.baseUrlPlaceholder}
            spellCheck={false}
            className="mt-1.5 w-full border border-line bg-surface px-3 py-2 font-mono text-sm text-ink outline-none focus:border-ink"
          />
        </label>
      )}

      {/* API key */}
      <label className="block">
        <span className="label">API key</span>
        <div className="mt-1.5 flex">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === "custom" ? "(any value, or leave a placeholder)" : "sk-…"}
            spellCheck={false}
            autoComplete="off"
            className="w-full border border-line bg-surface px-3 py-2 font-mono text-sm text-ink outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="border border-l-0 border-line bg-surface px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft hover:text-ink"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {/* Model */}
      <div>
        <span className="label">Model</span>
        <ModelSelect
          options={meta.models}
          value={model}
          isCustom={customModel}
          onSelect={(id) => {
            setCustomModel(false);
            setModel(id);
          }}
          onSelectCustom={() => {
            setCustomModel(true);
            setModel("");
          }}
        />
        {customModel && (
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Enter model id (e.g. llama3.3)"
            spellCheck={false}
            autoFocus
            className="mt-1.5 w-full border border-line bg-surface px-3 py-2 font-mono text-sm text-ink outline-none focus:border-ink"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="bg-ink px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-ink-faint"
        >
          Save &amp; connect
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
