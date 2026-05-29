'use client';

import { useState, useEffect } from 'react';
import { Github, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type IntegrationData = {
  id: string;
  enabled: boolean;
  token: string | null;
  baseUrl: string | null;
  metadata: Record<string, string> | null;
};

type IntegrationConfig = {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  metaFields: { key: string; label: string; placeholder: string }[];
  docsUrl: string;
};

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: <Github className="h-5 w-5" />,
    description: 'Push tasks as GitHub Issues with labels, milestones, and acceptance criteria.',
    fields: [
      { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxx', type: 'password' },
    ],
    metaFields: [
      { key: 'owner', label: 'Repository Owner', placeholder: 'username or org' },
      { key: 'repo', label: 'Repository Name', placeholder: 'my-project' },
    ],
    docsUrl: 'https://github.com/settings/tokens',
  },
  {
    id: 'linear',
    name: 'Linear',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 100 100" fill="currentColor">
        <path d="M1.22541 61.5228c-.97401-1.6673-.11584-3.8303 1.67148-4.5549L50 36.5l47.1031 20.4679c1.7873.7246 2.6455 2.8876 1.6715 4.5549L53.6715 97.4451c-1.6673 2.8547-5.6757 2.8547-7.343 0L1.22541 61.5228zM3.89189 33.4772c-.97401 1.6673-.11584 3.8303 1.67148 4.5549L50 58.5l44.4366-20.4679c1.7873-.7246 2.6455-2.8876 1.6715-4.5549L53.6715 2.55491c-1.6673-2.85471-5.6757-2.85471-7.343 0L3.89189 33.4772z" />
      </svg>
    ),
    description: 'Create Linear issues with priority mapping, estimates, and project grouping.',
    fields: [
      { key: 'token', label: 'API Key', placeholder: 'lin_api_xxxxxxxxxxxx', type: 'password' },
    ],
    metaFields: [
      { key: 'teamId', label: 'Team ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    ],
    docsUrl: 'https://linear.app/settings/api',
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z" />
      </svg>
    ),
    description: 'Create Jira issues with epics, time tracking, and priority mapping.',
    fields: [
      { key: 'token', label: 'API Token', placeholder: 'your-api-token', type: 'password' },
      { key: 'baseUrl', label: 'Instance URL', placeholder: 'https://your-domain.atlassian.net' },
    ],
    metaFields: [
      { key: 'email', label: 'Email', placeholder: 'you@company.com' },
      { key: 'projectKey', label: 'Project Key', placeholder: 'PRJ' },
    ],
    docsUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
  },
];

export function IntegrationsSettings() {
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.json())
      .then(data => {
        setIntegrations(data.integrations || []);
        // Initialize form state from existing data
        const state: Record<string, Record<string, string>> = {};
        for (const integ of data.integrations || []) {
          state[integ.id] = {
            token: '', // Never pre-fill token
            baseUrl: integ.baseUrl || '',
            ...(integ.metadata || {}),
          };
        }
        setFormState(state);
      })
      .catch(() => toast.error('Failed to load integrations'))
      .finally(() => setLoading(false));
  }, []);

  function getField(integId: string, key: string): string {
    return formState[integId]?.[key] || '';
  }

  function setField(integId: string, key: string, value: string) {
    setFormState(prev => ({
      ...prev,
      [integId]: { ...(prev[integId] || {}), [key]: value },
    }));
  }

  async function handleSave(config: IntegrationConfig) {
    setSaving(config.id);
    try {
      const fields = formState[config.id] || {};
      const metadata: Record<string, string> = {};
      for (const mf of config.metaFields) {
        if (fields[mf.key]) metadata[mf.key] = fields[mf.key];
      }

      const payload: Record<string, unknown> = {
        id: config.id,
        enabled: true,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };

      if (fields.token) payload.token = fields.token;
      if (config.fields.find(f => f.key === 'baseUrl')) {
        payload.baseUrl = fields.baseUrl || null;
      }

      const res = await fetch('/api/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setIntegrations(prev =>
          prev.map(i => i.id === config.id ? data.integration : i)
        );
        toast.success(`${config.name} integration saved`);
        // Clear token input after save
        setField(config.id, 'token', '');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
    } catch (err) {
      toast.error(`Failed to save ${config.name}`, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(null);
    }
  }

  async function handleDisable(integId: string) {
    try {
      const res = await fetch('/api/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: integId, enabled: false }),
      });
      if (res.ok) {
        setIntegrations(prev =>
          prev.map(i => i.id === integId ? { ...i, enabled: false } : i)
        );
        toast.success('Integration disabled');
      }
    } catch {
      toast.error('Failed to disable integration');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect external project management tools to push generated tasks directly.
      </p>

      {INTEGRATIONS.map(config => {
        const integ = integrations.find(i => i.id === config.id);
        const isEnabled = integ?.enabled ?? false;
        const hasToken = integ?.token && integ.token !== '';

        return (
          <Card key={config.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-foreground">{config.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{config.name}</span>
                    {isEnabled && hasToken ? (
                      <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not configured
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                </div>
              </div>
              <a
                href={config.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {config.fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={getField(config.id, field.key)}
                    onChange={e => setField(config.id, field.key, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
              {config.metaFields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    placeholder={field.placeholder}
                    value={getField(config.id, field.key)}
                    onChange={e => setField(config.id, field.key, e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => handleSave(config)}
                disabled={saving === config.id}
                className="h-7 text-xs"
              >
                {saving === config.id ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Save
              </Button>
              {isEnabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisable(config.id)}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Disable
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
