'use client';

import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type Props = {
  projectId: string;
  projectName: string;
  content: string;
};

const ICON_OPTIONS = [
  { value: 'FileText', label: 'Document' },
  { value: 'Globe', label: 'Web' },
  { value: 'Smartphone', label: 'Mobile' },
  { value: 'Server', label: 'Server' },
  { value: 'ShoppingCart', label: 'E-Commerce' },
  { value: 'Briefcase', label: 'Business' },
  { value: 'LayoutDashboard', label: 'Dashboard' },
  { value: 'Gamepad2', label: 'Game' },
  { value: 'GraduationCap', label: 'Education' },
  { value: 'Sparkles', label: 'AI/ML' },
  { value: 'User', label: 'User' },
];

export function SaveTemplateDialog({ projectId, projectName, content }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('FileText');

  function extractStructure(markdown: string): string[] {
    const headings = markdown.match(/^##\s+.+$/gm) ?? [];
    return headings.map((h) => h.replace(/^##\s+/, ''));
  }

  function generatePrompt(markdown: string, sections: string[]): string {
    // Build a context prompt from the PRD structure
    const sectionList = sections.map((s) => `- ${s}`).join('\n');
    return `This PRD follows a structured format with the following sections:\n${sectionList}\n\nUse this structure as a guide when generating the PRD. Ensure all sections are covered comprehensively.`;
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSaving(true);
    try {
      const structure = extractStructure(content);
      const prompt = generatePrompt(content, structure);

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || `Template based on "${projectName}"`,
          icon,
          prompt,
          structure,
          sourceProjectId: projectId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save template');
      }

      toast.success('Template saved! It will appear in "My Templates" when creating a new project.');
      setOpen(false);
      setName('');
      setDescription('');
      setIcon('FileText');
    } catch {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={() => {
          setName(`${projectName} Template`);
          setDescription('');
          setOpen(true);
        }}
      >
        <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
        Save Template
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this PRD structure as a reusable template for future projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Template"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template-desc">Description</Label>
            <Textarea
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this template is for..."
              className="h-20 resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <Select value={icon} onValueChange={(v) => { if (v) setIcon(v); }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              The template will capture the section structure of this PRD ({extractStructure(content).length} sections)
              and use it as guidance when generating new PRDs from this template.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
