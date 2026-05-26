'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsDialog } from '@/features/settings/components/settings-dialog';
import { EmptyState } from '@/features/dashboard/components/empty-state';
import { ProjectGrid } from '@/features/dashboard/components/project-grid';
import { useProjects } from '@/features/dashboard/hooks/use-projects';

export default function DashboardPage() {
  const router = useRouter();
  const { filtered, loading, search, setSearch, deletingId, remove, create } = useProjects();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    const id = await create('New Project', '');
    if (id) router.push(`/new?projectId=${id}`);
    setCreating(false);
  }

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-base font-semibold text-foreground">Projects</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="search-projects"
                name="search"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-52 h-8 text-sm bg-muted/50 border-border/40"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button
              id="btn-new-project"
              size="sm"
              onClick={handleCreate}
              disabled={creating}
              className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-3.5 h-3.5" />
              {creating ? 'Creating...' : 'New Project'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-lg bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onCreate={handleCreate} creating={creating} />
        ) : (
          <ProjectGrid projects={filtered} deletingId={deletingId} onDelete={remove} />
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
