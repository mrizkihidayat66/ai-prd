'use client';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ArrowUpDown } from 'lucide-react';
import { PROJECT_STATUS_LABELS } from '@/constants';
import type { ProjectStatus } from '@/types';
import type { SortOption } from '@/features/dashboard/hooks/use-projects';

type Props = {
  selectedStatus: ProjectStatus | 'ALL';
  selectedTags: string[];
  availableTags: string[];
  sortBy: SortOption;
  onStatusChange: (status: ProjectStatus | 'ALL') => void;
  onTagToggle: (tag: string) => void;
  onSortChange: (sort: SortOption) => void;
  onClearFilters: () => void;
};

const STATUS_OPTIONS: Array<{ value: ProjectStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Status' },
  { value: 'CLARIFYING', label: PROJECT_STATUS_LABELS.CLARIFYING },
  { value: 'REQUIREMENTS_LOCKED', label: PROJECT_STATUS_LABELS.REQUIREMENTS_LOCKED },
  { value: 'GENERATING', label: PROJECT_STATUS_LABELS.GENERATING },
  { value: 'PLAN_GENERATED', label: PROJECT_STATUS_LABELS.PLAN_GENERATED },
  { value: 'COMPLETED', label: PROJECT_STATUS_LABELS.COMPLETED },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'created', label: 'Date Created' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
];

export function ProjectFilters({
  selectedStatus,
  selectedTags,
  availableTags,
  sortBy,
  onStatusChange,
  onTagToggle,
  onSortChange,
  onClearFilters,
}: Props) {
  const hasActiveFilters = selectedStatus !== 'ALL' || selectedTags.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status Filter - Always Dropdown */}
      <Select value={selectedStatus} onValueChange={(value) => onStatusChange(value as ProjectStatus | 'ALL')}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">Tags:</span>
          <Select
            value={selectedTags[0] || 'none'}
            onValueChange={(value) => {
              if (value && value !== 'none') {
                onTagToggle(value);
              }
            }}
          >
            <SelectTrigger className="h-7 w-28 sm:w-32 text-xs">
              <SelectValue placeholder="Tags..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All tags</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center gap-1.5 ml-auto">
        <ArrowUpDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="h-7 w-28 sm:w-32 text-xs">
            <SelectValue>
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Tags */}
      {selectedTags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-xs px-2 py-0.5 gap-1 bg-primary/10 text-primary border-primary/20"
        >
          {tag}
          <button
            onClick={() => onTagToggle(tag)}
            className="hover:text-primary-foreground"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </Badge>
      ))}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
