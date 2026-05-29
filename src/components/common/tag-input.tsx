'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  readOnly?: boolean;
};

export function TagInput({
  tags,
  onTagsChange,
  placeholder = 'Add tag...',
  maxTags = 10,
  readOnly = false,
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      setInputValue('');
      setIsAdding(false);
    }
  }

  function addTag() {
    const trimmed = inputValue.trim().replace(/,/g, '');
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setInputValue('');
      return;
    }
    if (tags.length >= maxTags) return;

    onTagsChange([...tags, trimmed]);
    setInputValue('');
    setIsAdding(false);
  }

  function removeTag(tagToRemove: string) {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  }

  if (readOnly && tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-xs px-2 py-0.5 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
        >
          {tag}
          {!readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-primary-foreground"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </Badge>
      ))}

      {!readOnly && !isAdding && tags.length < maxTags && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            setIsAdding(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      )}

      {!readOnly && isAdding && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                addTag();
              } else {
                setIsAdding(false);
              }
            }}
            placeholder={placeholder}
            className="h-5 w-24 text-xs px-2 py-0"
          />
        </div>
      )}
    </div>
  );
}
