'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/features/dashboard/components/empty-state';
import { ProjectGrid } from '@/features/dashboard/components/project-grid';
import { ProjectFilters } from '@/features/dashboard/components/project-filters';
import { ProjectGridSkeleton } from '@/features/dashboard/components/project-skeleton';
import { DashboardStats } from '@/features/dashboard/components/dashboard-stats';
import { useKeyboardShortcuts, ShortcutHint } from '@/features/dashboard/hooks/use-keyboard-shortcuts';
import { useProjects } from '@/features/dashboard/hooks/use-projects';
import type { ProjectStatus } from '@/types';
import type { ProjectTemplate } from '@/features/dashboard/components/template-selector';

// Lazy load dialogs (only rendered when opened)
const SettingsDialog = dynamic(
  () => import('@/features/settings/components/settings-dialog').then(m => ({ default: m.SettingsDialog })),
);
const TemplateSelector = dynamic(
  () => import('@/features/dashboard/components/template-selector').then(m => ({ default: m.TemplateSelector })),
);

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    filtered,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    tagFilters,
    toggleTagFilter,
    availableTags,
    sortBy,
    setSortBy,
    clearFilters,
    deletingId,
    remove,
    duplicate,
    create,
  } = useProjects();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useKeyboardShortcuts({
    onNewProject: () => setTemplateOpen(true),
    onOpenSettings: () => setSettingsOpen(true),
  });
  const [templateOpen, setTemplateOpen] = useState(false);

  // Sync URL params with filters on mount
  useEffect(() => {
    const status = searchParams.get('status');
    const tags = searchParams.get('tags');
    const query = searchParams.get('q');

    if (status && status !== 'ALL') {
      setStatusFilter(status as ProjectStatus);
    }
    if (tags) {
      const tagList = tags.split(',').filter(Boolean);
      tagList.forEach((tag) => toggleTagFilter(tag));
    }
    if (query) {
      setSearch(query);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (tagFilters.length > 0) params.set('tags', tagFilters.join(','));
    if (search.trim()) params.set('q', search.trim());

    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    router.replace(newUrl, { scroll: false });
  }, [statusFilter, tagFilters, search, router]);

  async function handleCreate() {
    setTemplateOpen(true);
  }

  async function handleCreateWithTemplate(name: string, description: string, template: ProjectTemplate) {
    setCreating(true);
    const id = await create(name, description);
    if (id) {
      // Store template context in sessionStorage for the chat to pick up
      if (template.id !== 'blank' && template.prompt) {
        sessionStorage.setItem(`template_${id}`, JSON.stringify({
          id: template.id,
          name: template.name,
          prompt: template.prompt,
        }));
      }
      setTemplateOpen(false);
      router.push(`/new?projectId=${id}`);
    }
    setCreating(false);
  }

  return (
    <div id="dashboard-page" className="dashboard-page flex flex-col h-full">
      <header id="dashboard-header" className="dashboard-header sticky top-0 z-10 mx-4 mt-3 bg-card border border-border rounded-lg shadow-sm px-4 py-3 space-y-3">
        {/* Row 1: Title */}
        <h1 className="dashboard-title text-base font-semibold text-foreground">Projects</h1>

        {/* Row 2: Search + Filters (left) | New Project (right) */}
        <div className="dashboard-toolbar flex items-center gap-2 flex-wrap">
          <div className="dashboard-search relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="search-projects"
              name="search"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dashboard-search-input pl-8 pr-14 w-40 sm:w-52 h-8 text-sm bg-muted border-border"
            />
            <ShortcutHint keys="Ctrl+K" className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex" />
          </div>

          <ProjectFilters
            selectedStatus={statusFilter}
            selectedTags={tagFilters}
            availableTags={availableTags}
            sortBy={sortBy}
            onStatusChange={setStatusFilter}
            onTagToggle={toggleTagFilter}
            onSortChange={setSortBy}
            onClearFilters={clearFilters}
          />

          <Button
            id="btn-new-project"
            name="new-project"
            size="sm"
            onClick={handleCreate}
            disabled={creating}
            className="dashboard-new-project-btn ml-auto h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{creating ? 'Creating...' : 'New Project'}</span>
          </Button>
        </div>
      </header>

      <div id="dashboard-content" className="dashboard-content flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6">
        <DashboardStats />
        {loading ? (
          <ProjectGridSkeleton count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onCreate={handleCreate} creating={creating} />
        ) : (
          <ProjectGrid projects={filtered} deletingId={deletingId} onDelete={remove} onDuplicate={duplicate} />
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <TemplateSelector
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onCreate={handleCreateWithTemplate}
        creating={creating}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<ProjectGridSkeleton count={6} />}>
      <DashboardContent />
    </Suspense>
  );
}
