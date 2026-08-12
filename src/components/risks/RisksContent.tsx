'use client';

import React, { useState } from 'react';
import {
  Plus, Search, AlertTriangle, Sparkles, Edit2, Trash2,
  ChevronDown, Shield, CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Badge, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Textarea,
} from '@/components/ui/index';
import {
  cn, getRiskLevel, getRiskLevelColor, getRiskLevelBgColor,
  LIKELIHOOD_LABELS, IMPACT_LABELS, LIKELIHOOD_SCORES, IMPACT_SCORES,
  getStatusColor, formatDate, RISK_CATEGORIES,
} from '@/lib/utils';
import { toast } from 'sonner';
import type { RiskLikelihood, RiskImpact } from '@/types';

const LIKELIHOOD_VALUES: RiskLikelihood[] = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];
const IMPACT_VALUES: RiskImpact[] = ['negligible', 'minor', 'moderate', 'major', 'catastrophic'];

const STATUS_OPTIONS = [
  { value: 'identified', label: 'Identified' },
  { value: 'assessed',   label: 'Assessed'   },
  { value: 'mitigating', label: 'Mitigating' },
  { value: 'resolved',   label: 'Resolved'   },
  { value: 'accepted',   label: 'Accepted'   },
];

interface RisksContentProps {
  risks: any[];
  members: any[];
  orgId: string;
  userId: string;
  userRole: string;
}

type View = 'register' | 'heatmap';

const EMPTY_FORM = {
  title: '', description: '', category: '',
  likelihood: 'possible' as RiskLikelihood,
  impact: 'moderate' as RiskImpact,
  mitigation_plan: '', owner_id: '',
};

export function RisksContent({
  risks: initialRisks, members, orgId, userId, userRole,
}: RisksContentProps) {
  const [risks, setRisks] = useState(initialRisks);
  const [view, setView] = useState<View>('register');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiAssessing, setAiAssessing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [aiResult, setAiResult] = useState<any>(null);
  const [heatmapCell, setHeatmapCell] = useState<{ likelihood: string; impact: string } | null>(null);

  const canEdit = ['owner', 'admin', 'member'].includes(userRole);

  const filtered = risks.filter(r => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.category || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const currentScore = LIKELIHOOD_SCORES[form.likelihood] * IMPACT_SCORES[form.impact];
  const currentLevel = getRiskLevel(currentScore);

  // ── Open create modal ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingRisk(null);
    setForm(EMPTY_FORM);
    setAiResult(null);
    setShowModal(true);
  };

  // ── Open edit modal ──────────────────────────────────────────────────────
  const openEdit = (risk: any) => {
    setEditingRisk(risk);
    setForm({
      title: risk.title,
      description: risk.description || '',
      category: risk.category || '',
      likelihood: risk.likelihood,
      impact: risk.impact,
      mitigation_plan: risk.mitigation_plan || '',
      owner_id: risk.owner_id || '',
    });
    setAiResult(null);
    setShowModal(true);
  };

  // ── Save (create or update) ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Risk title is required');
    setLoading(true);
    try {
      if (editingRisk) {
        // UPDATE
        const res = await fetch(`/api/risks/${editingRisk.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            category: form.category || null,
            likelihood: form.likelihood,
            impact: form.impact,
            mitigation_plan: form.mitigation_plan.trim() || null,
            owner_id: form.owner_id || userId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Update failed');
        setRisks(prev => prev.map(r => r.id === editingRisk.id ? data.data : r));
        toast.success('Risk updated');
      } else {
        // CREATE
        const res = await fetch('/api/risks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            category: form.category || null,
            likelihood: form.likelihood,
            impact: form.impact,
            mitigation_plan: form.mitigation_plan.trim() || null,
            owner_id: form.owner_id || userId,
            organisation_id: orgId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Create failed');
        setRisks(prev => [data.data, ...prev]);
        toast.success('Risk added to register');
      }
      setShowModal(false);
      setEditingRisk(null);
      setForm(EMPTY_FORM);
      setAiResult(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save risk');
    } finally {
      setLoading(false);
    }
  };

  // ── Delete risk ───────────────────────────────────────────────────────────
  const handleDelete = async (riskId: string, riskTitle: string) => {
    if (!confirm(`Delete "${riskTitle}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/risks/${riskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setRisks(prev => prev.filter(r => r.id !== riskId));
      toast.success('Risk deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete risk');
    }
  };

  // ── Update status inline ─────────────────────────────────────────────────
  const handleStatusChange = async (riskId: string, status: string) => {
    try {
      const res = await fetch(`/api/risks/${riskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRisks(prev => prev.map(r => r.id === riskId ? { ...r, status } : r));
      toast.success(`Status updated to ${status}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // ── AI Assess ────────────────────────────────────────────────────────────
  const handleAIAssess = async () => {
    if (!form.title.trim()) return toast.error('Please enter a risk title first');
    setAiAssessing(true);
    try {
      const res = await fetch('/api/ai/assess-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiResult(data);
      setForm(prev => ({
        ...prev,
        likelihood: data.likelihood || prev.likelihood,
        impact: data.impact || prev.impact,
        mitigation_plan: data.mitigations?.length
          ? data.mitigations.map((m: string) => `• ${m}`).join('\n')
          : prev.mitigation_plan,
      }));
      toast.success('AI assessment complete');
    } catch (err: any) {
      toast.error(err.message || 'AI assessment failed');
    } finally {
      setAiAssessing(false);
    }
  };

  // -- Heat map --
  const heatMapRows = [...IMPACT_VALUES].reverse();
  const levelBg = {
    low:      'bg-emerald-400 hover:bg-emerald-500',
    medium:   'bg-amber-400 hover:bg-amber-500',
    high:     'bg-orange-500 hover:bg-orange-600',
    critical: 'bg-rose-500 hover:bg-rose-600',
  };

  const cellRisks = heatmapCell ? risks.filter(r => r.likelihood === heatmapCell.likelihood && r.impact === heatmapCell.impact) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            {(['register', 'heatmap'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  view === v
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v === 'register' ? '📋 Register' : '🗺️ Heat Map'}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search risks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 w-44 text-xs"
            />
          </div>
          {canEdit && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add Risk
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Risks',  value: risks.length,                                         color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'     },
          { label: 'Critical',     value: risks.filter(r => r.risk_score >= 17).length,          color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'     },
          { label: 'High',         value: risks.filter(r => r.risk_score >= 10 && r.risk_score <= 16).length, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Mitigating',   value: risks.filter(r => r.status === 'mitigating').length,  color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'  },
        ].map(s => (
          <Card key={s.label} className="card-hover">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg font-bold', s.color)}>
                {s.value}
              </div>
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── HEAT MAP VIEW ──────────────────────────────────────────── */}
      {view === 'heatmap' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Risk Heat Map</CardTitle>
              <CardDescription className="text-xs">
                Click a cell to see which risks sit there
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                  {/* Likelihood header */}
                  <div className="flex mb-1 ml-20">
                    {LIKELIHOOD_VALUES.map(l => (
                      <div key={l} className="flex-1 text-center text-[10px] text-muted-foreground font-medium px-0.5">
                        {LIKELIHOOD_LABELS[l].split(' ')[0]}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {heatMapRows.map(impact => (
                    <div key={impact} className="flex items-center mb-1 gap-1">
                      <div className="w-20 text-[10px] text-muted-foreground font-medium text-right pr-2 shrink-0 leading-tight">
                        {IMPACT_LABELS[impact]}
                      </div>
                      {LIKELIHOOD_VALUES.map(likelihood => {
                        const score = LIKELIHOOD_SCORES[likelihood] * IMPACT_SCORES[impact];
                        const level = getRiskLevel(score);
                        const cellCount = risks.filter(r => r.likelihood === likelihood && r.impact === impact).length;
                        const isSelected = heatmapCell?.likelihood === likelihood && heatmapCell?.impact === impact;

                        return (
                          <button
                            key={likelihood}
                            onClick={() => setHeatmapCell(
                              isSelected ? null : { likelihood, impact }
                            )}
                            className={cn(
                              'flex-1 h-14 rounded flex flex-col items-center justify-center text-white text-xs font-bold transition-all relative',
                              levelBg[level],
                              isSelected && 'ring-2 ring-foreground ring-offset-1',
                              'hover:scale-105 hover:shadow-lg'
                            )}
                            title={`${LIKELIHOOD_LABELS[likelihood]} × ${IMPACT_LABELS[impact]} = ${score}`}
                          >
                            <span className="text-base font-black">{score}</span>
                            {cellCount > 0 && (
                              <span className="text-[10px] bg-white/30 rounded px-1 mt-0.5">
                                {cellCount} risk{cellCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {/* Axis label */}
                  <div className="flex mt-2 ml-20 gap-3 flex-wrap">
                    {[
                      { label: 'Low (1-4)',       cls: 'bg-emerald-400' },
                      { label: 'Medium (5-9)',    cls: 'bg-amber-400'   },
                      { label: 'High (10-16)',    cls: 'bg-orange-500'  },
                      { label: 'Critical (17+)',  cls: 'bg-rose-500'    },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className={cn('w-3 h-3 rounded', l.cls)} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cell drill-down */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {heatmapCell
                  ? `${LIKELIHOOD_LABELS[heatmapCell.likelihood as RiskLikelihood]} × ${IMPACT_LABELS[heatmapCell.impact as RiskImpact]}`
                  : 'Select a cell'}
              </CardTitle>
              <CardDescription className="text-xs">
                {heatmapCell ? `${cellRisks.length} risk${cellRisks.length !== 1 ? 's' : ''} in this cell` : 'Click a cell to see risks'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!heatmapCell && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Click any cell on the heat map</p>
                </div>
              )}
              {heatmapCell && cellRisks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No risks in this cell</p>
              )}
              {cellRisks.map((r: any) => (
                <div key={r.id} className="p-2.5 rounded-lg border border-border">
                  <p className="text-xs font-semibold truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('status-badge text-[10px]', getStatusColor(r.status))}>
                      {r.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      Score: {r.risk_score}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── REGISTER VIEW ──────────────────────────────────────────── */}
      {view === 'register' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {risks.length === 0 ? 'No risks added yet' : 'No risks match your filters'}
                </p>
                {risks.length === 0 && canEdit && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                    + Add your first risk
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filtered.map(risk => {
              const level = getRiskLevel(risk.risk_score);
              return (
                <Card key={risk.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Score badge */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                        style={{ backgroundColor: getRiskLevelBgColor(level) }}
                      >
                        {risk.risk_score}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-foreground">{risk.title}</h3>
                          <span className={cn('status-badge capitalize', getRiskLevelColor(level))}>
                            {level}
                          </span>
                        </div>
                        {risk.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{risk.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            L: <strong>{LIKELIHOOD_LABELS[risk.likelihood as RiskLikelihood]}</strong>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            I: <strong>{IMPACT_LABELS[risk.impact as RiskImpact]}</strong>
                          </span>
                          {risk.category && (
                            <span className="text-xs text-muted-foreground">{risk.category}</span>
                          )}
                          {risk.owner && (
                            <span className="text-xs text-muted-foreground">
                              Owner: {risk.owner.full_name || risk.owner.email}
                            </span>
                          )}
                        </div>
                        {risk.mitigation_plan && (
                          <div className="mt-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground line-clamp-2">
                            <strong className="text-foreground">Mitigation: </strong>
                            {risk.mitigation_plan}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Inline status update */}
                        <Select
                          value={risk.status}
                          onValueChange={v => handleStatusChange(risk.id, v)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(risk)}
                              title="Edit risk"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            {['owner', 'admin'].includes(userRole) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDelete(risk.id, risk.title)}
                                title="Delete risk"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── ADD / EDIT RISK MODAL ──────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingRisk ? 'Edit Risk' : 'Add Risk'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingRisk(null); setAiResult(null); setForm(EMPTY_FORM); }}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Risk Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Customer data breach via phishing"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {RISK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Risk Owner</Label>
                  <Select value={form.owner_id} onValueChange={v => setForm(p => ({ ...p, owner_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name || m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the risk in detail..."
                  rows={2}
                />
              </div>

              {/* AI Assessment box */}
              <div className="rounded-lg border border-dashed border-brand-300 dark:border-brand-700 p-4 bg-brand-50/50 dark:bg-brand-900/10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-brand-700 dark:text-brand-400">AI Risk Assessment</p>
                    <p className="text-[11px] text-muted-foreground">Let AI score this risk and suggest mitigations</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAIAssess} loading={aiAssessing} className="text-xs h-7">
                    <Sparkles className="w-3 h-3" /> Assess with AI
                  </Button>
                </div>
                {aiResult && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-xs text-muted-foreground leading-relaxed">
                    {aiResult.rationale}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Likelihood</Label>
                  <Select value={form.likelihood} onValueChange={v => setForm(p => ({ ...p, likelihood: v as RiskLikelihood }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LIKELIHOOD_VALUES.map(l => (
                        <SelectItem key={l} value={l}>{LIKELIHOOD_LABELS[l]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Impact</Label>
                  <Select value={form.impact} onValueChange={v => setForm(p => ({ ...p, impact: v as RiskImpact }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IMPACT_VALUES.map(i => (
                        <SelectItem key={i} value={i}>{IMPACT_LABELS[i]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Score preview */}
              <div className={cn(
                'flex items-center justify-between p-3 rounded-lg text-sm font-semibold',
                getRiskLevelColor(currentLevel)
              )}>
                <span>Risk Score: {currentScore} / 25</span>
                <span className="capitalize">{currentLevel} Risk</span>
              </div>

              <div className="space-y-1.5">
                <Label>Mitigation Plan</Label>
                <Textarea
                  value={form.mitigation_plan}
                  onChange={e => setForm(p => ({ ...p, mitigation_plan: e.target.value }))}
                  placeholder="Describe mitigation strategies..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t">
              <Button
                variant="outline"
                onClick={() => { setShowModal(false); setEditingRisk(null); setAiResult(null); setForm(EMPTY_FORM); }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} loading={loading}>
                {editingRisk ? 'Save Changes' : 'Add to Register'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
