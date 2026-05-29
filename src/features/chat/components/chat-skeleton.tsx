import { Skeleton } from '@/components/ui/skeleton';
import { SparklesIcon, Brain, MessageSquare, FileText } from 'lucide-react';

type TypingPhase = 'thinking' | 'analyzing' | 'clarifying' | 'generating';

const PHASE_CONFIG: Record<TypingPhase, { icon: typeof Brain; label: string; color: string }> = {
  thinking: { icon: Brain, label: 'Thinking...', color: 'text-blue-400' },
  analyzing: { icon: SparklesIcon, label: 'Analyzing requirements...', color: 'text-purple-400' },
  clarifying: { icon: MessageSquare, label: 'Preparing questions...', color: 'text-amber-400' },
  generating: { icon: FileText, label: 'Generating PRD...', color: 'text-green-400' },
};

export function ChatTypingIndicator({ phase = 'thinking' }: { phase?: TypingPhase }) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  return (
    <div className="group/message w-full">
      <div className="flex items-start gap-3">
        <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
            <SparklesIcon className="size-3.5" />
          </div>
        </div>
        <div className="flex items-center gap-2 py-1">
          <Icon className={`size-3.5 animate-pulse ${config.color}`} />
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          <span className="flex gap-0.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
            <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
            <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export function ChatHistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ChatMessageSkeleton key={i} />
      ))}
    </div>
  );
}
