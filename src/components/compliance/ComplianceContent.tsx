'use client';

import React, { useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/index';
import { cn, getComplianceBgColor, getComplianceColor, getStatusColor, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface ComplianceContentProps {
  orgFrameworks: any[];
  allFrameworks: any[];
  controls: any[];
  orgId: string;
  userId: string;
  userRole: string;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  implemented:    CheckCircle2,
  in_progress:    Clock,
  not_started:    Circle,
  not_applicable: Minus,
};

export function ComplianceContent({
  orgFrameworks: initialOrgFW,
  allFrameworks,
  controls: initialControls,
  orgId,
  userId,
  userRole,
}: ComplianceContentProps) {
  const [orgFrameworks, setOrgFrameworks] = useState(initialOrgFW);
  const [controls, setControls] = useState(initialControls);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(
    initialOrgFW[0]?.framework_id || null
  );
  const [addingFramework, setAddingFramework] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [updatingControl, setUpdatingControl] = useState<string | null>(null);

  const canEdit = ['owner', 'admin', 'member'].includes(userRole);

  const selectedOrgFW = orgFrameworks.find(f => f.framework_id === selectedFrameworkId);
  const frameworkControls = controls.filter(c => c.framework_id === selectedFrameworkId);

  const unaddedFrameworks = allFrameworks.filter(
    f => !orgFrameworks.some(of => of.framework_id === f.id)
  );

  // ── Add framework ─────────────────────────────────────────────────────────
  const handleAddFramework = async (frameworkId: string) => {
    setAddingId(frameworkId);
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framework_id: frameworkId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add framework');

      // Add framework to local state
      setOrgFrameworks(prev => [...prev, data.data]);

      // Refresh controls from server by reloading the page data
      // We reload just the controls by fetching from the compliance page
      const ctrlRes = await fetch(`/api/compliance/controls?framework_id=${frameworkId}`);
      if (ctrlRes.ok) {
        const ctrlData = await ctrlRes.json();
        if (ctrlData.data) {
          setControls(prev => [...prev, ...ctrlData.data]);
        }
      } else {
        // If controls fetch fails, still show framework - user can refresh manually
        toast('Framework added. If controls do not appear, please refresh the page.', { icon: 'ℹ️' });
      }

      setSelectedFrameworkId(frameworkId);
      setAddingFramework(false);
      toast.success(`${data.data.framework?.name || 'Framework'} added with all controls`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add framework');
    } finally {
      setAddingId(null);
    }
  };

  // ── Update control status ─────────────────────────────────────────────────
  const handleUpdateControlStatus = async (controlId: string, status: string) => {
    setUpdatingControl(controlId);
    try {
      const res = await fetch(`/api/compliance/controls/${controlId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      // Update control in local state — NO page reload
      setControls(prev => prev.map(c => c.id === controlId ? { ...c, status } : c));

      // Recalculate compliance score locally for the selected framework
      const updatedControls = controls.map(c => c.id === controlId ? { ...c, status } : c);
      const fwControls = updatedControls.filter(c => c.framework_id === selectedFrameworkId);
      const applicable = fwControls.filter(c => c.status !== 'not_applicable');
      const implemented = applicable.filter(c => c.status === 'implemented').length;
      const newScore = applicable.length > 0 ? Math.round((implemented / applicable.length) * 100) : 0;

      setOrgFrameworks(prev => prev.map(f =>
        f.framework_id === selectedFrameworkId
          ? { ...f, compliance_score: newScore }
          : f
      ));

      toast.success(`Control updated to ${status.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update control');
    } finally {
      setUpdatingControl(null);
    }
  };

  // Group controls by category
  const controlsByCategory: Record<string, any[]> = frameworkControls.reduce((acc: Record<string, any[]>, c: any) => {
    const cat = c.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  // Compliance stats for selected framework
  const applicable = frameworkControls.filter((c: any) => c.status !== 'not_applicable');
  const implemented = applicable.filter(c => c.status === 'implemented').length;
  const inProgress = frameworkControls.filter(c => c.status === 'in_progress').length;
  const notStarted = frameworkControls.filter(c => c.status === 'not_started').length;
  const compliancePct = selectedOrgFW?.compliance_score || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Framework selector grid */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 min-w-0">
          {orgFrameworks.map(of => (
            <button
              key={of.id}
              onClick={() => setSelectedFrameworkId(of.framework_id)}
              className={cn(
                'text-left p-3 rounded-xl border transition-all',
                selectedFrameworkId === of.framework_id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{of.framework?.icon}</span>
                <span className="text-xs font-semibold truncate">{of.framework?.short_name}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-xs font-bold', getComplianceColor(of.compliance_score))}>
                  {of.compliance_score}%
                </span>
              </div>
              <Progress
                value={of.compliance_score}
                indicatorColor={getComplianceBgColor(of.compliance_score)}
                className="h-1"
              />
            </button>
          ))}

          {canEdit && !addingFramework && (
            <button
              onClick={() => setAddingFramework(true)}
              className="text-left p-3 rounded-xl border border-dashed border-border bg-card hover:bg-muted transition-all flex items-center justify-center gap-2 text-muted-foreground text-xs"
            >
              <Plus className="w-4 h-4" /> Add Framework
            </button>
          )}
        </div>
      </div>

      {/* Framework picker */}
      {addingFramework && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Add Compliance Framework</CardTitle>
              <button
                onClick={() => setAddingFramework(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {unaddedFrameworks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                All available frameworks have been added to your organisation.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {unaddedFrameworks.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleAddFramework(f.id)}
                    disabled={addingId === f.id}
                    className="text-left p-3 rounded-xl border border-border bg-card hover:bg-muted transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl mb-2 block">{f.icon}</span>
                    <p className="text-xs font-semibold">{f.short_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{f.name}</p>
                    {addingId === f.id && (
                      <p className="text-[10px] text-primary mt-1">Adding...</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected framework detail */}
      {selectedOrgFW && (
        <>
          {/* Framework overview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-3xl">{selectedOrgFW.framework?.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground">{selectedOrgFW.framework?.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {selectedOrgFW.framework?.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-2xl font-bold', getComplianceColor(compliancePct))}>
                    {compliancePct}%
                  </p>
                  <p className="text-xs text-muted-foreground">Compliant</p>
                </div>
              </div>

              <div className="mt-4">
                <Progress
                  value={compliancePct}
                  indicatorColor={getComplianceBgColor(compliancePct)}
                  className="h-2.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                {[
                  { label: 'Implemented', value: implemented, color: 'text-emerald-600' },
                  { label: 'In Progress',  value: inProgress,  color: 'text-amber-600'  },
                  { label: 'Not Started',  value: notStarted,  color: 'text-muted-foreground' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Controls by category */}
          {Object.keys(controlsByCategory).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No controls found for this framework. Try refreshing the page.
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(controlsByCategory).map(([category, cats]) => {
              const catImplemented = cats.filter(c => c.status === 'implemented').length;
              return (
                <Card key={category}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{category}</CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {catImplemented}/{cats.length} implemented
                      </span>
                    </div>
                    <Progress
                      value={cats.length > 0 ? Math.round((catImplemented / cats.length) * 100) : 0}
                      indicatorColor={getComplianceBgColor(
                        cats.length > 0 ? Math.round((catImplemented / cats.length) * 100) : 0
                      )}
                      className="h-1 mt-1"
                    />
                  </CardHeader>

                  <CardContent className="px-4 pb-4 space-y-1.5">
                    {cats.map(control => {
                      const StatusIcon = STATUS_ICONS[control.status] || Circle;
                      const isUpdating = updatingControl === control.id;

                      return (
                        <div
                          key={control.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn(
                            'w-5 h-5 shrink-0',
                            control.status === 'implemented'    ? 'text-emerald-600' :
                            control.status === 'in_progress'    ? 'text-amber-600'   :
                            control.status === 'not_applicable' ? 'text-muted-foreground/50' :
                            'text-muted-foreground'
                          )}>
                            <StatusIcon className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-muted-foreground shrink-0">
                                {control.control_id}
                              </span>
                              <span className="text-sm font-medium text-foreground truncate">
                                {control.name}
                              </span>
                            </div>
                            {control.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {control.description}
                              </p>
                            )}
                          </div>

                          {canEdit && (
                            <Select
                              value={control.status}
                              onValueChange={v => handleUpdateControlStatus(control.id, v)}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="w-36 h-7 text-xs shrink-0">
                                {isUpdating ? (
                                  <span className="text-xs text-muted-foreground">Saving...</span>
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="implemented">Implemented</SelectItem>
                                <SelectItem value="not_applicable">Not Applicable</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </>
      )}

      {/* Empty state */}
      {orgFrameworks.length === 0 && !addingFramework && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <p className="text-sm font-medium text-foreground mb-2">
              No compliance frameworks tracked yet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Add your first framework to start tracking compliance controls and scores
            </p>
            {canEdit && (
              <Button onClick={() => setAddingFramework(true)}>
                <Plus className="w-4 h-4" /> Add Your First Framework
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
