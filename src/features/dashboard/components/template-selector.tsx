'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Globe,
  Server,
  ShoppingCart,
  Gamepad2,
  GraduationCap,
  Briefcase,
  LayoutDashboard,
  FileText,
  Sparkles,
  Trash2,
  Download,
  Upload,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/common/confirm-dialog';

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  category?: 'built-in' | 'custom';
};

// Icon resolver for custom templates stored in DB
const ICON_MAP: Record<string, React.ReactNode> = {
  Smartphone: <Smartphone className="w-5 h-5" />,
  Globe: <Globe className="w-5 h-5" />,
  Server: <Server className="w-5 h-5" />,
  ShoppingCart: <ShoppingCart className="w-5 h-5" />,
  Gamepad2: <Gamepad2 className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  User: <User className="w-5 h-5" />,
};

function resolveIcon(iconName: string): React.ReactNode {
  return ICON_MAP[iconName] ?? <FileText className="w-5 h-5" />;
}

const BUILT_IN_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with no predefined context',
    icon: <FileText className="w-5 h-5" />,
    prompt: '',
    category: 'built-in',
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'iOS/Android app with native or cross-platform approach',
    icon: <Smartphone className="w-5 h-5" />,
    prompt: 'This is a mobile application project targeting iOS and Android platforms. Consider mobile-specific UX patterns, offline capabilities, push notifications, and app store requirements.',
    category: 'built-in',
  },
  {
    id: 'web-app',
    name: 'Web Application',
    description: 'Full-stack web app with frontend and backend',
    icon: <Globe className="w-5 h-5" />,
    prompt: 'This is a full-stack web application. Consider responsive design, authentication, database design, API architecture, and deployment strategy.',
    category: 'built-in',
  },
  {
    id: 'saas',
    name: 'SaaS Platform',
    description: 'Multi-tenant SaaS with subscriptions and billing',
    icon: <Briefcase className="w-5 h-5" />,
    prompt: 'This is a SaaS platform. Consider multi-tenancy, subscription billing, user management, onboarding flows, usage analytics, and scalability.',
    category: 'built-in',
  },
  {
    id: 'api-service',
    name: 'API Service',
    description: 'Backend API or microservice with integrations',
    icon: <Server className="w-5 h-5" />,
    prompt: 'This is a backend API service. Consider RESTful or GraphQL design, authentication/authorization, rate limiting, documentation, versioning, and monitoring.',
    category: 'built-in',
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Online store with products, cart, and payments',
    icon: <ShoppingCart className="w-5 h-5" />,
    prompt: 'This is an e-commerce platform. Consider product catalog, shopping cart, payment processing, order management, inventory tracking, and shipping integration.',
    category: 'built-in',
  },
  {
    id: 'dashboard',
    name: 'Admin Dashboard',
    description: 'Data visualization and management panel',
    icon: <LayoutDashboard className="w-5 h-5" />,
    prompt: 'This is an admin dashboard/management panel. Consider data visualization, CRUD operations, role-based access control, real-time updates, and reporting.',
    category: 'built-in',
  },
  {
    id: 'game',
    name: 'Game / Interactive',
    description: 'Game or interactive experience with real-time elements',
    icon: <Gamepad2 className="w-5 h-5" />,
    prompt: 'This is a game or interactive application. Consider real-time rendering, game mechanics, user input handling, state management, multiplayer capabilities, and performance optimization.',
    category: 'built-in',
  },
  {
    id: 'edtech',
    name: 'EdTech / Learning',
    description: 'Educational platform with courses and progress tracking',
    icon: <GraduationCap className="w-5 h-5" />,
    prompt: 'This is an educational technology platform. Consider course management, progress tracking, assessments, gamification, content delivery, and accessibility.',
    category: 'built-in',
  },
  {
    id: 'ai-product',
    name: 'AI-Powered Product',
    description: 'Product with AI/ML features and model integration',
    icon: <Sparkles className="w-5 h-5" />,
    prompt: 'This is an AI-powered product. Consider model selection, prompt engineering, inference costs, data pipelines, feedback loops, safety guardrails, and fallback strategies.',
    category: 'built-in',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, template: ProjectTemplate) => void;
  creating: boolean;
};

export function TemplateSelector({ open, onClose, onCreate, creating }: Props) {
  const confirm = useConfirm();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [projectName, setProjectName] = useState('');
  const [customTemplates, setCustomTemplates] = useState<ProjectTemplate[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // Fetch custom templates from DB when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingCustom(true);
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCustomTemplates(
            data.map((t: { id: string; name: string; description?: string; icon?: string; prompt: string }) => ({
              id: t.id,
              name: t.name,
              description: t.description || 'Custom template',
              icon: resolveIcon(t.icon || 'FileText'),
              prompt: t.prompt,
              category: 'custom' as const,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCustom(false));
  }, [open]);

  const allTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates];
  const selected = allTemplates.find((t) => t.id === selectedTemplate) ?? BUILT_IN_TEMPLATES[0];

  function handleCreate() {
    const name = projectName.trim() || 'New Project';
    onCreate(name, selected.prompt, selected);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !creating) {
      e.preventDefault();
      handleCreate();
    }
  }

  async function handleDeleteCustom(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Delete Template',
      description: 'Delete this custom template? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedTemplate === id) setSelectedTemplate('blank');
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/templates/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `templates-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Templates exported');
    } catch {
      toast.error('Failed to export templates');
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const templates = data.templates || data;
        const res = await fetch('/api/templates/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templates }),
        });
        const result = await res.json();
        if (result.imported > 0) {
          toast.success(`Imported ${result.imported} template(s)`);
          // Refresh custom templates
          const refreshRes = await fetch('/api/templates');
          const refreshData = await refreshRes.json();
          if (Array.isArray(refreshData)) {
            setCustomTemplates(
              refreshData.map((t: { id: string; name: string; description?: string; icon?: string; prompt: string }) => ({
                id: t.id,
                name: t.name,
                description: t.description || 'Custom template',
                icon: resolveIcon(t.icon || 'FileText'),
                prompt: t.prompt,
                category: 'custom' as const,
              }))
            );
          }
        } else {
          toast.error('No valid templates found in file');
        }
      } catch {
        toast.error('Failed to import templates');
      }
    };
    input.click();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Choose a template to get started, or start from scratch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto overflow-x-hidden">
          {/* Project name input */}
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="text-sm font-medium text-foreground">
              Project Name
            </label>
            <Input
              id="project-name"
              placeholder="My Awesome Project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9"
              autoFocus
            />
          </div>

          {/* Built-in templates */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Templates</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BUILT_IN_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border/50 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className={`${selectedTemplate === template.id ? 'text-primary' : 'text-muted-foreground'}`}>
                    {template.icon}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{template.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                      {template.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom templates */}
          {(customTemplates.length > 0 || loadingCustom) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">My Templates</label>
                <Badge variant="secondary" className="text-[10px]">
                  {customTemplates.length}
                </Badge>
              </div>
              {loadingCustom ? (
                <p className="text-xs text-muted-foreground py-2">Loading...</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {customTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`group/tpl relative flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all ${
                        selectedTemplate === template.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border/50 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDeleteCustom(template.id, e)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteCustom(template.id, e as unknown as React.MouseEvent); }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover/tpl:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
                        title="Delete template"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                      <div className={`${selectedTemplate === template.id ? 'text-primary' : 'text-muted-foreground'}`}>
                        {template.icon}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{template.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={handleImport}
              title="Import templates from JSON"
            >
              <Upload className="w-3 h-3" />
              Import
            </Button>
            {customTemplates.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={handleExport}
                title="Export custom templates as JSON"
              >
                <Download className="w-3 h-3" />
                Export
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
