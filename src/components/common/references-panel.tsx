'use client';

import { useState } from 'react';
import { Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReferenceChip } from '@/components/common/reference-chip';
import type { ProjectReference } from '@/types';

type Props = {
  references: ProjectReference[];
  onRemove?: (index: number) => void;
};

export function ReferencesPanel({ references, onRemove }: Props) {
  const [open, setOpen] = useState(false);

  if (references.length === 0) {
    return null;
  }

  const groupedRefs = {
    url: references.filter((r) => r.kind === 'url'),
    path: references.filter((r) => r.kind === 'path'),
    git: references.filter((r) => r.kind === 'git'),
    npm: references.filter((r) => r.kind === 'npm'),
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="w-4 h-4" />
          References ({references.length})
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Project References</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-4">
            {groupedRefs.url.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">URLs</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedRefs.url.map((ref, idx) => (
                    <ReferenceChip
                      key={`url-${idx}`}
                      reference={ref}
                      onRemove={onRemove ? () => onRemove(references.indexOf(ref)) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedRefs.path.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Paths</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedRefs.path.map((ref, idx) => (
                    <ReferenceChip
                      key={`path-${idx}`}
                      reference={ref}
                      onRemove={onRemove ? () => onRemove(references.indexOf(ref)) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedRefs.git.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Git Repos</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedRefs.git.map((ref, idx) => (
                    <ReferenceChip
                      key={`git-${idx}`}
                      reference={ref}
                      onRemove={onRemove ? () => onRemove(references.indexOf(ref)) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedRefs.npm.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">NPM Packages</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedRefs.npm.map((ref, idx) => (
                    <ReferenceChip
                      key={`npm-${idx}`}
                      reference={ref}
                      onRemove={onRemove ? () => onRemove(references.indexOf(ref)) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
