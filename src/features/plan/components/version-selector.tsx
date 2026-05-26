'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlanSnapshotEntry } from '@/types';

type Props = {
  currentVersion: number;
  snapshots: PlanSnapshotEntry[];
  onRestore: (snapshotId: string) => void;
  onSelectPreview: (content: string | null) => void;
  restoring?: boolean;
};

export function VersionSelector({
  currentVersion,
  snapshots,
  onRestore,
  onSelectPreview,
  restoring,
}: Props) {
  if (snapshots.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Version:</span>
      <Select
        defaultValue="current"
        onValueChange={(val) => {
          if (val === 'current') {
            onSelectPreview(null);
          } else {
            const snap = snapshots.find((s) => s.id === val);
            if (snap) onSelectPreview(snap.content);
          }
        }}
      >
        <SelectTrigger className="h-7 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">v{currentVersion} (current)</SelectItem>
          {snapshots.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              v{s.version} — {new Date(s.createdAt).toLocaleDateString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        disabled={restoring}
        onClick={() => {
          const selectEl = document.querySelector('[data-state="closed"]');
          const val = selectEl?.getAttribute('data-value');
          if (val && val !== 'current') onRestore(val);
        }}
      >
        <RotateCcw className="w-3 h-3 mr-1" /> Restore
      </Button>
    </div>
  );
}
