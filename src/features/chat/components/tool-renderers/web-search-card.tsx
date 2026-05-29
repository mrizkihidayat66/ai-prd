'use client';

import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

type SearchResult = {
  title: string;
  snippet: string;
  url: string;
};

type Props = {
  query: string;
  results: SearchResult[];
};

export function WebSearchCard({ query, results }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Guard against undefined/invalid results
  const safeResults = Array.isArray(results) ? results : [];

  return (
    <div id="web-search-card" className="web-search-card my-2 rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
      <button
        name="toggle-search-results"
        onClick={() => setExpanded(!expanded)}
        className="web-search-toggle w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/20 transition-colors"
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Searched: {query}</span>
        <span className="ml-auto shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {expanded && (
        <div className="web-search-results px-3 pb-3 space-y-2 border-t border-border/30">
          {safeResults.length === 0 ? (
            <p className="text-xs text-muted-foreground pt-2">No results found.</p>
          ) : (
            safeResults.map((r, i) => (
              <div key={i} className="pt-2">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {r.title}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-muted-foreground mt-0.5">{r.snippet}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
