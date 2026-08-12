'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, CheckCircle2, XCircle, AlertTriangle, AlertOctagon,
  Circle, Loader2, FileSearch, ChevronDown, ChevronUp, ShieldAlert,
  Clock, Check, X, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/index';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RunFullAudit } from '@/components/findings/RunFullAudit';

interface FindingsContentProps {
  frameworks: any[];
  controls: any[];
  initialFindings: any[];
  orgId: string;
  userRole: string;
}

const DETERMINATION_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  satisfied: { label: 'Satisfied',  color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200', icon: CheckCircle2 },
  partial:   { label: 'Partial',    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200',       icon: AlertTriangle },
  gap:       { label: 'Gap',        color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-200',           icon: AlertOctagon },
  not_assessed: { label: 'Not Assessed', color: 'text-muted-foreground bg-muted border-border',                     icon: Circle },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical:      { label: 'Critical',      color: 'text-rose-700 bg-rose-100 dark:bg-rose-900/30' },
  high:          { label: 'High',          color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30' },
  medium:        { label: 'Medium',        color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30' },
  low:           { label: 'Low',           color: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30' },
  informational: { label: 'Info',          color: 'text-muted-foreground bg-muted' },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  high:   { label: 'High confidence',   color: 'text-emerald-600' },
  medium: { label: 'Medium confidence', color: 'text-amber-600' },
  low:    { label: 'Low confidence',    color: 'text-rose-600' },
};

export function FindingsContent({ frameworks, controls, initialFindings, orgId, userRole }: FindingsContentProps) {
  const router = useRouter();
  const [findings, setFindings] = useState<any[]>(initialFindings);
  const [selectedFramework, setSelectedFramework] = useState<string>(frameworks[0]?.framework_id || '');
  const [analyzingControlId, setAnalyzingControlId] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const canReview = ['owner', 'admin', 'member'].includes(userRole);

  // Controls for the selected framework
  const frameworkControls = controls.filter(c => c.framework_id === selectedFramework);

  // Map: control_id -> latest finding for it
  const latestFindingByControl = new Map<string, any>();
  for (const f of findings) {
    const existing = latestFindingByControl.get(f.control_id);
    if (!existing || new Date(f.generated_at) > new Date(existing.generated_at)) {
      latestFindingByControl.set(f.control_id, f);
    }
  }

  // Findings list filtered by status
  const visibleFindings = findings.filter(f => {
    if (statusFilter === 'all') return true;
    return f.status === statusFilter;
  }).filter(f => !selectedFramework || f.framework_id === selectedFramework);

  const handleAnalyzeControl = async (controlId: string) => {
    setAnalyzingControlId(controlId);
    try {
      const res = await fetch('/api/findings/analyze-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ control_id: controlId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Add or replace the finding for this control
      setFindings(prev => {
        const filtered = prev.filter(f => f.control_id !== controlId);
        return [{ ...data.data, control: controls.find(c => c.id === controlId) }, ...filtered];
      });
      toast.success('Finding generated — review it below');
      setExpandedFinding(data.data.id);
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setAnalyzingControlId(null);
    }
  };

  const handleReview = async (findingId: string, action: 'accept' | 'dismiss') => {
    try {
      const res = await fetch('/api/findings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding_id: findingId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFindings(prev => prev.map(f =>
        f.id === findingId ? { ...f, status: action === 'accept' ? 'accepted' : 'dismissed' } : f
      ));
      toast.success(action === 'accept' ? 'Finding accepted' : 'Finding dismissed');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const draftCount = findings.filter(f => f.status === 'draft_pending_review').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Liability notice — important for a compliance product */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
          AuditPilot generates <strong>draft findings</strong> based on your uploaded evidence and a regulation
          knowledge base that is currently <strong>pending legal review</strong>. These are decision-support
          drafts, not legal determinations. Every finding must be reviewed and accepted by a qualified person
          before it forms part of your compliance record.
        </p>
      </div>

      {/* Framework selector + draft count */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select framework" /></SelectTrigger>
            <SelectContent>
              {frameworks.map(f => (
                <SelectItem key={f.framework_id} value={f.framework_id}>
                  {f.framework?.short_name || f.framework?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {draftCount > 0 && (
            <Badge variant="warning" className="text-xs">
              <Clock className="w-3 h-3 mr-1" /> {draftCount} pending review
            </Badge>
          )}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All findings</SelectItem>
            <SelectItem value="draft_pending_review">Pending review</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Run Full Audit — batch */}
      {selectedFramework && (
        <RunFullAudit
          frameworkId={selectedFramework}
          frameworkName={frameworks.find(f => f.framework_id === selectedFramework)?.framework?.short_name || 'framework'}
          onComplete={() => router.refresh()}
        />
      )}

      {/* Controls to analyze */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Controls</CardTitle>
          <CardDescription className="text-xs">
            Click Analyze on any control to generate a draft finding from your evidence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {frameworkControls.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No controls for this framework. Add the framework in Compliance first.
            </p>
          ) : (
            frameworkControls.map(control => {
              const finding = latestFindingByControl.get(control.id);
              const detConfig = finding ? DETERMINATION_CONFIG[finding.determination] : null;
              return (
                <div key={control.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{control.control_id}</span>
                      <span className="text-xs font-medium text-foreground truncate">{control.name}</span>
                    </div>
                  </div>

                  {finding && detConfig && (
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', detConfig.color)}>
                      {detConfig.label}
                    </span>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 shrink-0"
                    onClick={() => handleAnalyzeControl(control.id)}
                    disabled={analyzingControlId === control.id}
                  >
                    {analyzingControlId === control.id ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                    ) : finding ? (
                      <><Sparkles className="w-3 h-3" /> Re-analyze</>
                    ) : (
                      <><FileSearch className="w-3 h-3" /> Analyze</>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Findings list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Findings {visibleFindings.length > 0 && `(${visibleFindings.length})`}
        </h3>

        {visibleFindings.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FileSearch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No findings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Analyze a control above to generate your first finding</p>
            </CardContent>
          </Card>
        ) : (
          visibleFindings.map(finding => {
            const detConfig = DETERMINATION_CONFIG[finding.determination] || DETERMINATION_CONFIG.not_assessed;
            const sevConfig = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;
            const confConfig = CONFIDENCE_CONFIG[finding.confidence] || CONFIDENCE_CONFIG.low;
            const DetIcon = detConfig.icon;
            const isExpanded = expandedFinding === finding.id;
            const isDraft = finding.status === 'draft_pending_review';

            return (
              <Card key={finding.id} className={cn(
                'border-l-4',
                finding.determination === 'gap' ? 'border-l-rose-500' :
                finding.determination === 'partial' ? 'border-l-amber-500' :
                finding.determination === 'satisfied' ? 'border-l-emerald-500' : 'border-l-muted'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <DetIcon className={cn('w-5 h-5 shrink-0 mt-0.5',
                      finding.determination === 'gap' ? 'text-rose-500' :
                      finding.determination === 'partial' ? 'text-amber-500' :
                      finding.determination === 'satisfied' ? 'text-emerald-500' : 'text-muted-foreground'
                    )} />

                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground">{finding.title}</h4>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', sevConfig.color)}>
                          {sevConfig.label}
                        </span>
                        {isDraft && (
                          <Badge variant="warning" className="text-[10px]">
                            <Clock className="w-2.5 h-2.5 mr-0.5" /> Draft
                          </Badge>
                        )}
                        {finding.status === 'accepted' && (
                          <Badge variant="success" className="text-[10px]">Accepted</Badge>
                        )}
                        {finding.status === 'dismissed' && (
                          <Badge variant="secondary" className="text-[10px]">Dismissed</Badge>
                        )}
                      </div>

                      {/* Control ref + confidence */}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground">
                          {finding.control?.control_id} · {finding.control?.name}
                        </span>
                        <span className={cn('text-[11px] font-medium', confConfig.color)}>
                          {confConfig.label}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{finding.summary}</p>

                      {/* Unverified regulation warning */}
                      {finding.used_unverified_regulation && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-700 dark:text-amber-400">
                          <ShieldAlert className="w-3 h-3" />
                          Based on unverified regulation text — confirm against official POPIA before acting
                        </div>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedFinding(isExpanded ? null : finding.id)}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline mt-2"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? 'Hide details' : 'Show reasoning, evidence & recommendation'}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3 pt-3 border-t border-border">
                          <div>
                            <p className="text-[11px] font-semibold text-foreground mb-1">Reasoning</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{finding.reasoning}</p>
                          </div>
                          {finding.evidence_summary && (
                            <div>
                              <p className="text-[11px] font-semibold text-foreground mb-1 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Evidence Referenced
                              </p>
                              <p className="text-xs text-muted-foreground">{finding.evidence_summary}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[11px] font-semibold text-foreground mb-1">Recommendation</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{finding.recommendation}</p>
                          </div>
                        </div>
                      )}

                      {/* Review actions — only on drafts */}
                      {isDraft && canReview && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                          <Button
                            size="sm"
                            className="h-7 text-[11px] px-3 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleReview(finding.id, 'accept')}
                          >
                            <Check className="w-3 h-3" /> Accept Finding
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-3"
                            onClick={() => handleReview(finding.id, 'dismiss')}
                          >
                            <X className="w-3 h-3" /> Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
