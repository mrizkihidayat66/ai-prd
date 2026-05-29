'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SnapshotDiffViewer } from './snapshot-diff-viewer';
import { GitCompare } from 'lucide-react';

type Snapshot = {
  id: string;
  version: number;
  content: string;
  createdAt: string;
};

type Props = {
  projectId: string;
  currentContent: string;
  currentVersion: number;
};

export function CompareDialog({ projectId, currentContent, currentVersion }: Props) {
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSnapshots();
    }
  }, [open]);

  async function fetchSnapshots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshots`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
        if (data.snapshots?.length > 0) {
          setSelectedSnapshotId(data.snapshots[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
    } finally {
      setLoading(false);
    }
  }

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <GitCompare className="w-3.5 h-3.5 mr-1.5" />
          Compare Versions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Compare PRD Versions</DialogTitle>
          <DialogDescription>
            Select a previous version to compare with the current PRD
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Compare with:</label>
            <Select
              value={selectedSnapshotId}
              onValueChange={(value) => {
                if (value) setSelectedSnapshotId(value);
              }}
              disabled={loading || snapshots.length === 0}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select version..." />
              </SelectTrigger>
              <SelectContent>
                {snapshots.map((snapshot) => (
                  <SelectItem key={snapshot.id} value={snapshot.id}>
                    Version {snapshot.version} -{' '}
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 min-h-0 border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading snapshots...
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No previous versions available
            </div>
          ) : selectedSnapshot ? (
            <SnapshotDiffViewer
              oldContent={selectedSnapshot.content}
              newContent={currentContent}
              oldLabel={`Version ${selectedSnapshot.version}`}
              newLabel={`Version ${currentVersion} (Current)`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a version to compare
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
