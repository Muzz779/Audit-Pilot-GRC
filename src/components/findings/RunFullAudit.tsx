'use client';

import React, { useState, useRef } from 'react';
import { PlayCircle, Loader2, CheckCircle2, XCircle, StopCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// The search service limits calls per minute. When a step reports that limit,
// wait for it to clear and run the same control again.
const RATE_LIMIT_WAIT_MS = 20_000;
const MAX_RATE_LIMIT_RETRIES = 6;

interface RunFullAuditProps {
  frameworkId: string;
  frameworkName: string;
  onComplete: () => void;   // called when the run finishes so the page can refresh findings
}

interface RunState {
  runId: string;
  total: number;
  toProcess: number;
  skipped: number;
  processed: number;
  satisfied: number;
  partial: number;
  gap: number;
  failed: number;
  lastControl?: string;
}

export function RunFullAudit({ frameworkId, frameworkName, onComplete }: RunFullAuditProps) {
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<RunState | null>(null);
  const cancelRef = useRef(false);

  const startRun = async (rerunAll = false) => {
    if (rerunAll && !window.confirm(
      `Analyse all ${frameworkName} controls again against your current evidence?

` +
      'Each control gets a new draft finding to review. Earlier findings, including accepted ones, ' +
      'stay in the history, and control statuses only change when you accept a new finding. ' +
      'This uses one AI operation per control.'
    )) return;
    setRunning(true);
    cancelRef.current = false;
    setState(null);

    try {
      // 1. Start the run
      const startRes = await fetch('/api/audit-runs/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework_id: frameworkId, rerun_all: rerunAll }),
      });
      const startData = await startRes.json();

      if (!startRes.ok) {
        toast.error(startData.error || 'Could not start audit');
        setRunning(false);
        return;
      }

      let current: RunState = {
        runId: startData.run_id,
        total: startData.total_controls,
        toProcess: startData.to_process,
        skipped: startData.skipped,
        processed: 0,
        satisfied: 0,
        partial: 0,
        gap: 0,
        failed: 0,
      };
      setState(current);

      if (startData.skipped > 0) {
        toast(`Skipping ${startData.skipped} control(s) that already have findings`, { icon: 'ℹ️' });
      }

      // 2. Step through the queue, one control per request
      let done = false;
      let quotaMessage = '';
      let rateLimitRetries = 0;
      let lastError = '';
      while (!done && !cancelRef.current) {
        const stepRes = await fetch('/api/audit-runs/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ run_id: current.runId }),
        });
        const stepData = await stepRes.json();

        if (!stepRes.ok) {
          toast.error(stepData.error || 'Audit step failed');
          break;
        }

        if (stepData.rate_limited) {
          rateLimitRetries++;
          if (rateLimitRetries > MAX_RATE_LIMIT_RETRIES) {
            toast.error('The document search service is busy. Run Full Audit again in a few minutes to continue.');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
          continue;
        }
        rateLimitRetries = 0;
        if (stepData.last_error) lastError = stepData.last_error;

        done = stepData.done;
        if (stepData.quota_exceeded) quotaMessage = stepData.message || 'Monthly AI limit reached.';

        if (stepData.run) {
          const r = stepData.run;
          current = {
            ...current,
            processed: r.processed_controls,
            satisfied: r.satisfied_count,
            partial: r.partial_count,
            gap: r.gap_count,
            failed: r.failed_controls,
            lastControl: stepData.last_control,
          };
          setState({ ...current });
        }
      }

      if (cancelRef.current) {
        // Mark the run cancelled server-side
        await fetch('/api/audit-runs/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ run_id: current.runId, cancel: true }),
        }).catch(() => {});
        toast('Audit stopped. Findings generated so far have been saved.', { icon: '⏸️' });
      } else if (quotaMessage) {
        toast(quotaMessage, { icon: '🚫' });
      } else if (done && current.failed > 0) {
        toast.error(
          `${current.failed} control(s) could not be analyzed, so they have no finding. Run Full Audit again to retry them. ${lastError}`,
          { duration: 15_000 }
        );
      } else if (done) {
        toast.success('Full audit complete — review the draft findings below');
      }

      onComplete();

    } catch (err: any) {
      toast.error(err.message || 'Audit run failed');
    } finally {
      setRunning(false);
    }
  };

  const stopRun = () => {
    cancelRef.current = true;
  };

  const handled = state ? state.processed + state.failed : 0;
  const progressPct = state && state.toProcess > 0
    ? Math.round((handled / state.toProcess) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Run Full Audit</p>
          <p className="text-xs text-muted-foreground">
            Analyze every {frameworkName} control against your evidence in one pass.
            Controls that already have findings are skipped. After adding new evidence, use Re-run all controls.
          </p>
        </div>
        {!running ? (
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => startRun(true)} size="sm" variant="outline">
              <RotateCcw className="w-4 h-4" /> Re-run all controls
            </Button>
            <Button onClick={() => startRun(false)} size="sm">
              <PlayCircle className="w-4 h-4" /> Run Full Audit
            </Button>
          </div>
        ) : (
          <Button onClick={stopRun} size="sm" variant="outline" className="shrink-0">
            <StopCircle className="w-4 h-4" /> Stop
          </Button>
        )}
      </div>

      {/* Progress */}
      {state && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            {running && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />}
            <span className="text-xs text-muted-foreground">
              {running
                ? `Analyzing control ${Math.min(handled + 1, state.toProcess)} of ${state.toProcess}...`
                : `Processed ${state.processed} of ${state.toProcess} controls`}
              {state.lastControl && running && (
                <span className="text-muted-foreground/70"> — last: {state.lastControl}</span>
              )}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Live tallies */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" /> {state.satisfied} satisfied
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              {state.partial} partial
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              {state.gap} gap
            </span>
            {state.failed > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <XCircle className="w-3 h-3" /> {state.failed} failed
              </span>
            )}
            {state.skipped > 0 && (
              <span className="text-muted-foreground">{state.skipped} skipped</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
