'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  search: string;
  onCreate: () => void;
  creating: boolean;
};

export function EmptyState({ search, onCreate, creating }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-72 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Plus className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {search ? 'No projects found' : 'No projects yet'}
        </p>
        <p className="text-sm text-muted-foreground">
          {search
            ? 'Try a different search term.'
            : 'Create your first project to get started.'}
        </p>
      </div>
      {!search && (
        <Button
          onClick={onCreate}
          disabled={creating}
          className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4" />
          {creating ? 'Creating…' : 'New Project'}
        </Button>
      )}
    </div>
  );
}
