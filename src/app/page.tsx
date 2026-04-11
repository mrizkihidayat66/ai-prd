'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsDialog } from '@/components/settings-dialog';
import { ProjectCard } from '@/components/project/project-card';
import { useProjects } from '@/hooks/use-projects';

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

  async function handleAutopilotTest() {
    setCreating(true);
    const id = await create('Test Pipeline', 'Autopilot E2E test run');
    if (id) router.push(`/new?projectId=${id}&testMode=true`);
    setCreating(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-violet-500/20">
              ✦
            </div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              init-ai
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 h-8 text-sm bg-muted/50 border-border/40 focus:border-violet-500/50"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
              onClick={() => setSettingsOpen(true)}
            >
              ⚙️
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating}
              className="h-8 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20"
            >
              {creating ? '…' : '+ New Project'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <span className="animate-pulse">Loading projects…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="text-4xl opacity-30">✦</div>
            <p className="text-muted-foreground">
              {search ? 'No projects match your search.' : 'No projects yet. Create your first one!'}
            </p>
            {!search && (
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white"
              >
                {creating ? 'Creating…' : '+ New Project'}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={remove}
                deleting={deletingId === project.id}
              />
            ))}
          </div>
        )}

        {/* Dev-only test pipeline button */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 pt-4 border-t border-border/20 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutopilotTest}
              disabled={creating}
              className="text-xs text-muted-foreground border-border/40 hover:border-amber-500/50 hover:text-amber-400"
            >
              🧪 Test Pipeline (dev only)
            </Button>
          </div>
        )}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
