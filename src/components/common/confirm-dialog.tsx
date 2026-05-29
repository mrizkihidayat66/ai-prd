'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    description: '',
  });
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setOpen(false);
    resolver?.(true);
    setResolver(null);
  };

  const handleCancel = () => {
    setOpen(false);
    resolver?.(false);
    setResolver(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <DialogContent id="confirm-dialog" className="confirm-dialog sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <div className="confirm-dialog-header flex items-center gap-3">
              {options.variant === 'destructive' && (
                <div className="confirm-dialog-icon w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
              )}
              <div>
                <DialogTitle>{options.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {options.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="confirm-dialog-footer mt-4 gap-2 sm:gap-0">
            <Button name="confirm-cancel" variant="outline" onClick={handleCancel}>
              {options.cancelLabel || 'Cancel'}
            </Button>
            <Button
              name="confirm-ok"
              variant={options.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
            >
              {options.confirmLabel || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
