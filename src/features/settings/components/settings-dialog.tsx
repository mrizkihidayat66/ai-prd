'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { Settings2, ChevronDown, ChevronUp, Plug } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationsSettings } from './integrations-settings';

type SettingsData = {
  provider: string;
  model: string;
  customModels: string | null;
  apiKey: string | null;
  baseUrl: string | null;
  temperature: number;
  maxTokens: number;
  contextLength: number;
  topP: number;
};

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini'],
  agentrouter: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-1.5-pro'],
  openai_compatible: ['gpt-4o-mini', 'llama-3.1-8b-instruct', 'deepseek-coder-6.7b-instruct', 'qwen/qwen3-vl-4b'],
  anthropic: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  lmstudio: ['qwen/qwen3-vl-4b', 'deepseek-coder-6.7b-instruct', 'meta-llama-3.1-8b-instruct'],
  ollama: ['llama3.3', 'mistral', 'codellama', 'deepseek-coder-v2', 'deepseek-coder-6.7b-instruct', 'qwen2.5-coder', 'nvidia/nemotron-3-nano-4b'],
};

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [settings, setSettings] = useState<SettingsData>({
    provider: 'openai',
    model: 'auto',
    customModels: null,
    apiKey: null,
    baseUrl: null,
    temperature: 0,
    maxTokens: 65536,
    contextLength: 131072,
    topP: 1,
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [modelTagInput, setModelTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  async function readJsonSafe(response: Response): Promise<Record<string, unknown> | null> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  // Fetch the specific provider's settings when dialog opens or provider dropdown changes
  useEffect(() => {
    if (open) {
      fetch(`/api/settings?provider=${settings.provider}`)
        .then(async (r) => ({ ok: r.ok, data: await readJsonSafe(r) }))
        .then(({ ok, data }) => {
          if (!ok || !data?.settings) {
            throw new Error(
              (typeof data?.error === 'string' ? data.error : null) ||
              'Failed to load settings'
            );
          }
          setApiKeyInput('');
          setSettings(data.settings as SettingsData);
        })
        .catch((error) => {
          console.error('Failed to load settings', error);
          toast.error('Failed to load settings');
        });
    }
  }, [open, settings.provider]);

  async function handleSave() {
    setSaving(true);
    setStatus('idle');
    try {
      const payload: Record<string, unknown> = {
        provider: settings.provider,
        model: settings.model,
        customModels: settings.customModels,
        baseUrl: settings.baseUrl,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        contextLength: settings.contextLength,
        topP: settings.topP,
      };
      if (apiKeyInput) {
        payload.apiKey = apiKeyInput;
      }
      payload.makeActive = true; // Make this provider globally active when saving

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        setStatus('saved');
        toast.success('Settings saved successfully');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      setStatus('error');
      toast.error('Failed to save settings');
    }
    setSaving(false);
  }

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text?: string; error?: string } | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = {
        provider: settings.provider,
        model: settings.model,
        baseUrl: settings.baseUrl,
        apiKey: apiKeyInput || settings.apiKey || '',
      };
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJsonSafe(res);
      const result = data
        ? {
            success: Boolean(data.success),
            text: typeof data.text === 'string' ? data.text : undefined,
            error: typeof data.error === 'string' ? data.error : undefined,
          }
        : { success: false, error: 'Empty response from test endpoint' };
      
      setTestResult(result);
      
      if (result.success) {
        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed', { description: result.error });
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setTestResult({ success: false, error: errorMsg });
      toast.error('Connection test failed', { description: errorMsg });
    }
    setTesting(false);
  }

  // Parse custom models list
  const parsedCustomModels = (settings.customModels || '')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
  const modelOptions = parsedCustomModels.length > 0
    ? parsedCustomModels
    : (PROVIDER_MODELS[settings.provider] || []);

  function setCustomModels(next: string[]) {
    const deduped = Array.from(new Set(next.map((m) => m.trim()).filter(Boolean)));
    setSettings({ ...settings, customModels: deduped.join(', ') || null });
  }

  function addModelTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setCustomModels([...(parsedCustomModels || []), value]);
    setModelTagInput('');
  }

  function removeModelTag(target: string) {
    setCustomModels(parsedCustomModels.filter((m) => m !== target));
  }

  function onTagInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addModelTag(modelTagInput);
      return;
    }

    if (e.key === 'Backspace' && !modelTagInput && parsedCustomModels.length > 0) {
      const last = parsedCustomModels[parsedCustomModels.length - 1];
      removeModelTag(last);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="settings-dialog" className="settings-dialog sm:max-w-lg bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="settings-dialog-title text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="llm" className="settings-tabs w-full">
          <TabsList className="settings-tabs-list w-full">
            <TabsTrigger value="llm" name="tab-llm" className="flex-1 text-xs">
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              LLM Provider
            </TabsTrigger>
            <TabsTrigger value="integrations" name="tab-integrations" className="flex-1 text-xs">
              <Plug className="h-3.5 w-3.5 mr-1.5" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="llm">
        <div className="space-y-5 py-2">
          {/* Provider */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={(v: string | null) => {
                const newProvider = v ?? 'openai';
                setSettings({ ...settings, provider: newProvider });
              }}
            >
              <SelectTrigger id="settings-provider" className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="agentrouter">AgentRouter</SelectItem>
                <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                <SelectItem value="lmstudio">LM Studio (Local)</SelectItem>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Config (2-Step Manual List) */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="space-y-2">
              <Label>Available Models List</Label>
              <div className="bg-muted/50 border border-input rounded-md p-2 min-h-[42px]">
                <div className="flex flex-wrap gap-2">
                  {parsedCustomModels.map((model) => (
                    <span
                      key={model}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-primary/10 border border-primary/30 text-primary"
                    >
                      <span className="font-mono">{model}</span>
                      <button
                        type="button"
                        onClick={() => removeModelTag(model)}
                        className="text-primary/70 hover:text-foreground"
                        aria-label={`Remove ${model}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    id="settings-model-tag"
                    name="modelTag"
                    type="text"
                    value={modelTagInput}
                    onChange={(e) => setModelTagInput(e.target.value)}
                    onKeyDown={onTagInputKeyDown}
                    onBlur={() => addModelTag(modelTagInput)}
                    placeholder="Type a model and press Enter"
                    className="flex-1 min-w-[220px] bg-transparent outline-none text-xs font-mono py-1"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Add one model per tag. Press Enter or comma to create a tag.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Active Model</Label>
              <Select
                value={settings.model}
                onValueChange={(v: string | null) => setSettings({ ...settings, model: v ?? 'auto' })}
              >
                <SelectTrigger id="settings-model" className="bg-muted/50 font-mono text-sm">
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="font-semibold text-primary">Auto (Default)</SelectItem>
                  {modelOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* API Key */}
          {settings.provider !== 'ollama' && (
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                id="settings-api-key"
                name="apiKey"
                type="password"
                placeholder={settings.apiKey || 'Enter API key...'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="bg-muted/50 font-mono text-sm"
              />
              {settings.apiKey && settings.apiKey.startsWith('••••••') && !apiKeyInput && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {settings.apiKey}
                </p>
              )}
            </div>
          )}

          {/* Base URL (Ollama & AgentRouter) */}
          {(settings.provider === 'ollama' || settings.provider === 'agentrouter' || settings.provider === 'openai_compatible' || settings.provider === 'lmstudio') && (
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                id="settings-base-url"
                name="baseUrl"
                placeholder="http://localhost:11434/v1"
                value={settings.baseUrl || ''}
                onChange={(e) =>
                  setSettings({ ...settings, baseUrl: e.target.value || null })
                }
                className="bg-muted/50 font-mono text-sm"
              />
            </div>
          )}

          {/* Advanced Settings - Collapsible */}
          <div className="border-t border-border pt-4">
            <button
              type="button"
              name="toggle-advanced-settings"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="settings-advanced-toggle flex items-center justify-between w-full text-sm font-medium hover:text-foreground transition-colors"
            >
              <span>Advanced Settings</span>
              {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {advancedOpen && (
              <div className="mt-4 space-y-4 pl-2 border-l-2 border-muted">
                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="settings-temperature">Temperature</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {settings.temperature.toFixed(1)}
                    </span>
                  </div>
                  <Input
                    id="settings-temperature"
                    name="temperature"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={settings.temperature}
                    onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) || 0 })}
                    className="bg-muted/50 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Controls randomness. 0 = deterministic, higher = more creative.
                  </p>
                </div>

                {/* Context Length */}
                <div className="space-y-2">
                  <Label htmlFor="settings-context-length">Context Length</Label>
                  <Input
                    id="settings-context-length"
                    name="contextLength"
                    type="number"
                    min={1024}
                    max={1000000}
                    step={1024}
                    value={settings.contextLength}
                    onChange={(e) => setSettings({ ...settings, contextLength: parseInt(e.target.value) || 131072 })}
                    className="bg-muted/50 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Maximum input tokens. Default: 128k (131072)
                  </p>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <Label htmlFor="settings-max-tokens">Max Tokens</Label>
                  <Input
                    id="settings-max-tokens"
                    name="maxTokens"
                    type="number"
                    min={1024}
                    max={200000}
                    step={1024}
                    value={settings.maxTokens}
                    onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) || 65536 })}
                    className="bg-muted/50 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Maximum output tokens. Default: 64k (65536)
                  </p>
                </div>

                {/* Top P */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="settings-top-p">Top P</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {settings.topP.toFixed(2)}
                    </span>
                  </div>
                  <Input
                    id="settings-top-p"
                    name="topP"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.topP}
                    onChange={(e) => setSettings({ ...settings, topP: parseFloat(e.target.value) || 1 })}
                    className="bg-muted/50 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Nucleus sampling. 1 = consider all tokens, lower = more focused.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Save & Test */}
          <div className="flex flex-col gap-3 pt-2">
            {testResult && (
              <div className={`text-sm p-3 rounded-md ${
                testResult.success
                  ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20'
                  : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20'
              }`}>
                {testResult.success
                  ? `Ping successful! Response: ${testResult.text}`
                  : `Test failed: ${testResult.error}`}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <Button
                id="btn-test-connection"
                name="test-connection"
                variant="outline"
                onClick={handleTest}
                disabled={testing}
                className="settings-test-btn border-border hover:bg-primary/10 transition-colors"
                type="button"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>

              <div className="flex items-center gap-3">
                {status === 'saved' && (
                  <span className="text-sm text-[var(--color-success)] animate-in fade-in zoom-in duration-300">Saved!</span>
                )}
                {status === 'error' && (
                  <span className="text-sm text-[var(--color-danger)] animate-in fade-in zoom-in duration-300">Failed</span>
                )}
                <Button
                  id="btn-save-settings"
                  name="save-settings"
                  onClick={handleSave}
                  disabled={saving}
                  className="settings-save-btn"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsSettings />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
