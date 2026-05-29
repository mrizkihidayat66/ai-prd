'use client';

import { ExternalLink, FileCode, GitBranch, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProjectReference } from '@/types';
import { formatReference } from '@/lib/references';

type Props = {
  reference: ProjectReference;
  onRemove?: () => void;
};

export function ReferenceChip({ reference, onRemove }: Props) {
  const icon = {
    url: <ExternalLink className="w-3 h-3" />,
    path: <FileCode className="w-3 h-3" />,
    git: <GitBranch className="w-3 h-3" />,
    npm: <Package className="w-3 h-3" />,
  }[reference.kind];

  const colorClass = {
    url: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    path: 'bg-green-500/20 text-green-400 border-green-500/30',
    git: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    npm: 'bg-red-500/20 text-red-400 border-red-500/30',
  }[reference.kind];

  const handleClick = () => {
    if (reference.kind === 'url') {
      window.open(reference.value, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Badge
      variant="outline"
      className={`${colorClass} flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={handleClick}
    >
      {icon}
      <span className="text-xs font-medium">{formatReference(reference)}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:text-foreground transition-colors"
          aria-label="Remove reference"
        >
          ×
        </button>
      )}
    </Badge>
  );
}
