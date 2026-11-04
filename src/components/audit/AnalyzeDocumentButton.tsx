'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, FileSearch, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AnalyzeDocumentButtonProps {
  evidenceId: string;
  hasFile: boolean;
  onAnalysisComplete?: () => void;
}

type Status = 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';

// The search service limits calls per minute. When a step reports that limit,
// wait for it to clear before sending the next step.
const RATE_LIMIT_WAIT_MS = 20_000;
const MAX_STALLED_STEPS = 6;

export function AnalyzeDocumentButton({ evidenceId, hasFile, onAnalysisComplete }: AnalyzeDocumentButtonProps) {
  const [status, setStatus] = useState<Status>('not_started');
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  // Check existing analysis status on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/evidence/analyze?evidence_id=${evidenceId}`);
        const data = await res.json();
        if (!cancelled && data.data) {
          setStatus(data.data.status);
          setChunkCount(data.data.chunk_count || null);
          setErrorMessage(data.data.error_message || null);
        }
      } catch {
        // silently fall back to not_started
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    })();
    return () => { cancelled = true; };
  }, [evidenceId]);

  const handleAnalyze = async (reanalyze = false, continuing = false) => {
    setAnalyzing(true);
    setStatus('processing');
    setErrorMessage(null);
    setProgress(null);
    try {
      // Large files take several steps: the server saves what it finished and
      // says `continue`, so a dropped step can be resumed with Try Again.
      let data: any;
      let resume = continuing;
      let lastProcessed = -1;
      let stalledSteps = 0;
      while (true) {
        const res = await fetch('/api/evidence/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidence_id: evidenceId, reanalyze, resume }),
        });
        // A platform timeout returns an HTML page, not JSON
        data = await res.json().catch(() => ({
          error: 'Analysis timed out. Try Again to continue from where it stopped.',
        }));

        if (!res.ok) throw new Error(data.error || 'Analysis failed');
        if (!data.continue) break;

        setProgress(Math.round((data.processed / data.total) * 100));
        resume = true;

        if (data.rate_limited) {
          stalledSteps = data.processed > lastProcessed ? 0 : stalledSteps + 1;
          if (stalledSteps >= MAX_STALLED_STEPS) {
            throw new Error('The document search service is busy. Try Again in a few minutes to continue from where it stopped.');
          }
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
        }
        lastProcessed = data.processed;
      }

      setStatus('completed');
      setChunkCount(data.chunk_count);
      setErrorMessage(data.warning || null);
      if (data.warning) toast.warning(data.warning);
      else toast.success(data.message || 'Document analyzed successfully');
      onAnalysisComplete?.();
    } catch (err: any) {
      setStatus('failed');
      setErrorMessage(err.message);
      toast.error(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!hasFile) {
    return (
      <span className="text-[10px] text-muted-foreground italic">
        No file attached — cannot analyze
      </span>
    );
  }

  if (checkingStatus) {
    return (
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Checking status...
      </span>
    );
  }

  if (status === 'completed' && !analyzing) {
    const handleReanalyze = () => {
      const confirmed = window.confirm(
        'Re-analyze this document? Existing findings that cite it will lose their page or row citation, so run those controls again afterwards.'
      );
      if (confirmed) handleAnalyze(true);
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          Analyzed — {chunkCount} searchable section{chunkCount !== 1 ? 's' : ''}
        </div>
        {errorMessage && (
          <p className="text-[10px] text-amber-700 dark:text-amber-400 max-w-xs">{errorMessage}</p>
        )}
        <button
          type="button"
          onClick={handleReanalyze}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-3 h-3" /> Re-analyze
        </button>
      </div>
    );
  }

  if (status === 'processing' || analyzing) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        {progress === null ? 'Analyzing... this can take a minute' : `Analyzing... ${progress}% done. Keep this page open.`}
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-3 h-3" />
          Analysis failed
        </div>
        {errorMessage && (
          <p className="text-[10px] text-muted-foreground max-w-xs">{errorMessage}</p>
        )}
        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleAnalyze(false, true)}>
          <Sparkles className="w-3 h-3" /> Try Again
        </Button>
      </div>
    );
  }

  // not_started
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 text-[10px] px-2"
      onClick={() => handleAnalyze()}
      loading={analyzing}
    >
      <FileSearch className="w-3 h-3" /> Analyze Document
    </Button>
  );
}
