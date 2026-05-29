'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  projectId: string;
  onComplete: () => void;
  onCancel: () => void;
  continueFrom?: string;
};

export function PrdStreamingViewer({ projectId, onComplete, onCancel, continueFrom }: Props) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'streaming' | 'complete' | 'error' | 'truncated'>('streaming');
  const [error, setError] = useState<string | null>(null);
  const [continuationCount, setContinuationCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef('');

  const streamGeneration = useCallback(async (continueFrom?: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus('streaming');

    try {
      const fetchOptions: RequestInit = {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      };

      // If continuing, send the existing content
      if (continueFrom) {
        fetchOptions.body = JSON.stringify({ continueFrom });
      }

      const response = await fetch(`/api/projects/${projectId}/generate`, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulated = continueFrom || '';
      let lastChunkTime = Date.now();
      const INACTIVITY_TIMEOUT_MS = 60000; // 60 seconds
      let sseBuffer = '';

      while (true) {
        // Check for inactivity timeout
        if (Date.now() - lastChunkTime > INACTIVITY_TIMEOUT_MS) {
          // Provider stalled — treat as truncated if we have content
          if (accumulated.length > 200) {
            setStatus('truncated');
          } else {
            setStatus('error');
            setError('Stream inactive for 60 seconds — generation may be stuck');
          }
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          // Stream closed without finish/error event.
          // SDK guarantees finish/error on all server-side paths,
          // so this is exclusively a network disconnect between client↔server.
          if (accumulated.length > 200) {
            // Substantial content exists — treat as recoverable (truncated)
            setStatus('truncated');
          } else {
            setStatus('error');
            setError('Connection lost before content was generated');
          }
          break;
        }

        // Reset inactivity timer on each chunk
        lastChunkTime = Date.now();

        const chunk = decoder.decode(value, { stream: true });
        sseBuffer += chunk;

        // Parse SSE lines from buffer
        const lines = sseBuffer.split('\n');
        // Keep the last incomplete line in the buffer
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip empty lines and comments (SSE spec)
          if (!trimmed || trimmed.startsWith(':')) continue;

          // Parse "data: ..." lines
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();

          // End of stream marker
          if (jsonStr === '[DONE]') break;

          try {
            const event = JSON.parse(jsonStr) as {
              type: string;
              delta?: string;
              finishReason?: string;
              errorText?: string;
            };

            switch (event.type) {
              case 'text-delta': {
                if (event.delta) {
                  accumulated += event.delta;
                  contentRef.current = accumulated;
                  setContent(accumulated);

                  // Auto-scroll to bottom
                  setTimeout(() => {
                    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
                break;
              }
              case 'finish': {
                // Definitive signal from server about why generation stopped
                if (event.finishReason === 'length') {
                  setStatus('truncated');
                } else if (accumulated.includes('<!-- PRD_COMPLETE -->')) {
                  // Model confirmed it finished all sections — strip marker and mark complete
                  const cleanContent = accumulated.replace(/\n?<!-- PRD_COMPLETE -->\n?/g, '').trim();
                  contentRef.current = cleanContent;
                  setContent(cleanContent);
                  setStatus('complete');
                } else if (accumulated.length < 2000) {
                  // Too short to be a complete PRD — treat as truncated for auto-continue
                  setStatus('truncated');
                } else {
                  // Model said 'stop' but no end marker — likely incomplete, treat as truncated
                  setStatus('truncated');
                }
                return; // Exit the loop — we're done
              }
              case 'error': {
                setStatus('error');
                setError(event.errorText || 'Unknown streaming error');
                return; // Exit the loop
              }
              // Ignore other event types (text-start, text-end, start, start-step, finish-step, etc.)
              default:
                break;
            }
          } catch {
            // Skip malformed JSON lines — could be partial data
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('error');
        setError('Generation cancelled');
      } else {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  }, [projectId]);

  useEffect(() => {
    streamGeneration(continueFrom || undefined);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [streamGeneration, continueFrom]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    onCancel();
  };

  const handleDone = () => {
    onComplete();
  };

  const handleContinue = useCallback(() => {
    if (continuationCount >= 5) {
      setStatus('error');
      setError('Maximum continuation attempts reached (5). The PRD may be too complex for the current token limit.');
      return;
    }
    setContinuationCount((c) => c + 1);
    streamGeneration(contentRef.current);
  }, [continuationCount, streamGeneration]);

  // Auto-continue when truncated
  useEffect(() => {
    if (status !== 'truncated') return;
    if (continuationCount >= 5) return;

    const timer = setTimeout(() => {
      handleContinue();
    }, 1500);

    return () => clearTimeout(timer);
  }, [status, continuationCount, handleContinue]);

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 flex flex-col border-border">
        <CardHeader className="border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {status === 'streaming' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span>Generating PRD{continuationCount > 0 ? ` (Part ${continuationCount + 1})` : ''}...</span>
                </>
              )}
              {status === 'complete' && (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>PRD Generated Successfully</span>
                </>
              )}
              {status === 'truncated' && (
                <>
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <span>PRD Incomplete — Token Limit Reached</span>
                </>
              )}
              {status === 'error' && (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span>Generation Failed</span>
                </>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {status === 'streaming' && (
                <Button variant="outline" size="sm" onClick={handleStop}>
                  Stop
                </Button>
              )}
              {status === 'truncated' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleDone}>
                    View as-is
                  </Button>
                  <Button size="sm" disabled className="bg-yellow-600 hover:bg-yellow-700">
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Auto-continuing...
                  </Button>
                </>
              )}
              {status === 'complete' && (
                <Button size="sm" onClick={handleDone}>
                  View PRD
                </Button>
              )}
              {status === 'error' && (
                <>
                  {contentRef.current.length > 200 && (
                    <Button size="sm" onClick={handleContinue}>
                      Continue from here
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => streamGeneration()}>
                    Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={onCancel}>
                    Close
                  </Button>
                </>
              )}
            </div>
          </div>
          {status === 'truncated' && (
            <p className="text-sm text-yellow-400 mt-2">
              Token limit reached — automatically continuing generation...
              {continuationCount > 0 && ` (Attempt ${continuationCount}/5)`}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {error ? (
                <div className="text-red-400 text-sm">
                  <p className="font-semibold mb-2">Error:</p>
                  <p>{error}</p>
                </div>
              ) : content ? (
                <div className="prose dark:prose-invert prose-sm max-w-4xl mx-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Starting generation...</span>
                </div>
              )}
              <div ref={scrollRef} className="h-4" />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
