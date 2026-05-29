'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, FileText, Code, FileJson, Loader2 } from 'lucide-react';
import { exportPrd, type ExportFormat } from '@/lib/export';
import { toast } from '@/lib/toast';

type Props = {
  content: string;
  projectName: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

const exportFormats = [
  {
    format: 'md' as ExportFormat,
    label: 'Markdown',
    description: 'Export as .md file',
    icon: FileText,
  },
  {
    format: 'html' as ExportFormat,
    label: 'HTML',
    description: 'Export as standalone .html file',
    icon: Code,
  },
  {
    format: 'pdf' as ExportFormat,
    label: 'PDF',
    description: 'Export as .pdf document',
    icon: FileText,
  },
  {
    format: 'json' as ExportFormat,
    label: 'JSON',
    description: 'Export as structured .json data',
    icon: FileJson,
  },
];

export function ExportDialog({
  content,
  projectName,
  version,
  createdAt,
  updatedAt,
}: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    setExporting(format);
    try {
      await exportPrd({
        content,
        projectName,
        format,
        metadata: {
          version,
          createdAt,
          updatedAt,
        },
      });
      toast.success('Exported', `PRD exported as ${format.toUpperCase()}`);
      setOpen(false);
    } catch (error) {
      toast.error(
        'Export failed',
        error instanceof Error ? error.message : 'Failed to export PRD'
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export PRD</DialogTitle>
          <DialogDescription>
            Choose a format to export your Product Requirements Document
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 mt-4">
          {exportFormats.map(({ format, label, description, icon: Icon }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={exporting !== null}
              className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                {exporting === format ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Icon className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
