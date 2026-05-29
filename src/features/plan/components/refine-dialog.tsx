'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Props = {
  projectId: string;
  onRefineStart: () => void;
};

export function RefineDialog({ projectId, onRefineStart }: Props) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [refining, setRefining] = useState(false);

  async function handleRefine() {
    if (!instructions.trim()) return;

    setRefining(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: instructions.trim() }),
      });

      if (response.ok) {
        setOpen(false);
        setInstructions('');
        toast.success('PRD refinement started');
        onRefineStart();
      } else {
        console.error('Refine failed:', response.statusText);
        toast.error('Failed to start refinement');
      }
    } catch (err) {
      console.error('Refine error:', err);
      toast.error('Failed to start refinement');
    } finally {
      setRefining(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Refine PRD
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Refine PRD</DialogTitle>
          <DialogDescription>
            Describe what you'd like to change, add, or improve in the PRD. The AI will update the document accordingly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="instructions">Refinement Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="e.g., Add a section about mobile app support, or change the database from PostgreSQL to MongoDB, or add more detail to the authentication section..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={refining}>
            Cancel
          </Button>
          <Button onClick={handleRefine} disabled={!instructions.trim() || refining}>
            {refining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Refine
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
