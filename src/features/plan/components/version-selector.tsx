'use client';

import { useState } from 'react';
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
  const [selectedValue, setSelectedValue] = useState<string>('current');

  if (snapshots.length === 0) return null;

  function handleValueChange(val: string | null) {
    if (!val) return;
    setSelectedValue(val);
    if (val === 'current') {
      onSelectPreview(null);
    } else {
      const snap = snapshots.find((s) => s.id === val);
      if (snap) onSelectPreview(snap.content);
    }
  }

  function handleRestore() {
    if (selectedValue && selectedValue !== 'current') {
      onRestore(selectedValue);
    }
  }

  return (
    <div id="version-selector" className="version-selector flex items-center gap-2">
      <span className="version-selector-label text-xs text-muted-foreground">Version:</span>
      <Select value={selectedValue} onValueChange={handleValueChange}>
        <SelectTrigger id="version-select" className="version-select-trigger h-7 w-40 text-xs">
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
        name="restore-version"
        className="version-restore-btn h-7 text-xs"
        disabled={restoring || selectedValue === 'current'}
        onClick={handleRestore}
      >
        <RotateCcw className="w-3 h-3 mr-1" /> Restore
      </Button>
    </div>
  );
}
