'use client';

import { useMemo } from 'react';
import { parseDiff, Diff, Hunk, tokenize } from 'react-diff-view';
import { createTwoFilesPatch } from 'diff';
import 'react-diff-view/style/index.css';
import { ScrollArea } from '@/components/ui/scroll-area';

type Props = {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
};

export function SnapshotDiffViewer({
  oldContent,
  newContent,
  oldLabel = 'Previous Version',
  newLabel = 'Current Version',
}: Props) {
  const { diffText, files } = useMemo(() => {
    const diffText = createTwoFilesPatch(
      'prd.md',
      'prd.md',
      oldContent,
      newContent,
      oldLabel,
      newLabel,
      { context: 3 }
    );
    const files = parseDiff(diffText, { nearbySequences: 'zip' });
    return { diffText, files };
  }, [oldContent, newContent, oldLabel, newLabel]);

  const tokens = useMemo(() => {
    if (!files.length) return undefined;
    try {
      // tokenize options accept highlight + enhancers; cast through unknown to
      // satisfy the library's loose typings without leaking `any`.
      const options: { highlight: boolean; enhancers: unknown[] } = {
        highlight: false,
        enhancers: [],
      };
      return tokenize(files[0].hunks, options as Parameters<typeof tokenize>[1]);
    } catch {
      return undefined;
    }
  }, [files]);

  if (!files.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No changes detected
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="diff-viewer-wrapper">
        <Diff
          viewType="split"
          diffType={files[0].type}
          hunks={files[0].hunks}
          tokens={tokens}
          renderGutter={(options) => {
            const { change, side, renderDefault, inHoverState } = options;
            if (change.type === 'normal') {
              return (
                <td className="diff-gutter diff-gutter-normal">
                  {renderDefault()}
                </td>
              );
            }
            return (
              <td
                className={`diff-gutter diff-gutter-${change.type} ${
                  inHoverState ? 'diff-gutter-hover' : ''
                }`}
              >
                {renderDefault()}
              </td>
            );
          }}
        >
          {(hunks) =>
            hunks.map((hunk) => (
              <Hunk key={hunk.content} hunk={hunk} />
            ))
          }
        </Diff>
      </div>
    </ScrollArea>
  );
}
