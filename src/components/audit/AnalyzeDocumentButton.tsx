'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AnalyzeDocumentButtonProps {
  evidenceId: string;
  hasFile: boolean;
  onAnalysisComplete?: () => void;
}

type Status = 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';

export function AnalyzeDocumentButton({ evidenceId, hasFile, onAnalysisComplete }: AnalyzeDocumentButtonProps) {
  const [status, setStatus] = useState<Status>('not_started');
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

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

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setStatus('processing');
    try {
      const res = await fetch('/api/evidence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence_id: evidenceId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      setStatus('completed');
      setChunkCount(data.chunk_count);
      toast.success(data.message || 'Document analyzed successfully');
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

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Analyzed — {chunkCount} searchable section{chunkCount !== 1 ? 's' : ''}
      </div>
    );
  }

  if (status === 'processing' || analyzing) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Analyzing... this can take a minute
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
        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={handleAnalyze}>
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
      onClick={handleAnalyze}
      loading={analyzing}
    >
      <FileSearch className="w-3 h-3" /> Analyze Document
    </Button>
  );
}
