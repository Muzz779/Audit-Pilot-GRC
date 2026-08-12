'use client';

import React, { useState } from 'react';
import {
  Plus, Search, FileText, BookOpen, CheckCircle, Clock,
  Archive, Edit2, Eye, Trash2, ChevronRight, Sparkles,
  Users, Save, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Badge, Input, Label, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Textarea,
} from '@/components/ui/index';
import { cn, formatDate, getStatusColor, POLICY_CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';

const POLICY_TEMPLATES = [
  { name: 'Data Protection & Privacy Policy',   category: 'Privacy',    description: 'POPIA-aligned personal information processing policy' },
  { name: 'Information Security Policy',         category: 'Security',   description: 'Core information security governance framework' },
  { name: 'Acceptable Use Policy',               category: 'IT',         description: 'Guidelines for acceptable use of IT systems' },
  { name: 'AI Usage Policy',                     category: 'Technology', description: 'Governance for artificial intelligence tool usage' },
  { name: 'Incident Response Policy',            category: 'Security',   description: 'Security incident detection and response procedures' },
  { name: 'Remote Work Security Policy',         category: 'Security',   description: 'Security requirements for remote workers' },
  { name: 'Business Continuity Policy',          category: 'Operations', description: 'Business continuity and disaster recovery governance' },
  { name: 'Vendor Management Policy',            category: 'Operations', description: 'Third-party vendor risk and relationship management' },
  { name: 'Change Management Policy',            category: 'IT',         description: 'Controls for managing changes to IT systems' },
  { name: 'Data Retention & Disposal Policy',    category: 'Privacy',    description: 'Rules for retaining and securely disposing of data' },
];

type Tab = 'all' | 'approved' | 'draft' | 'review' | 'templates';

interface PoliciesContentProps {
  policies: any[];
  members: any[];
  orgId: string;
  userId: string;
  userRole: string;
}

export function PoliciesContent({
  policies: initialPolicies,
  members,
  orgId,
  userId,
  userRole,
}: PoliciesContentProps) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', category: '', content: '' });
  const [creating, setCreating] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '', content: '' });
  const [saving, setSaving] = useState(false);

  // View modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);

  // Acknowledge modal
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackPolicy, setAckPolicy] = useState<any>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  const canEdit = ['owner', 'admin', 'member'].includes(userRole);
  const canAdmin = ['owner', 'admin'].includes(userRole);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = policies.filter(p => {
    const matchTab = activeTab === 'all' || p.status === activeTab;
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    all: policies.length,
    approved: policies.filter(p => p.status === 'approved').length,
    draft: policies.filter(p => p.status === 'draft').length,
    review: policies.filter(p => p.status === 'review').length,
    templates: POLICY_TEMPLATES.length,
  };

  // ── Create policy ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.title.trim()) return toast.error('Policy title is required');
    setCreating(true);
    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description.trim(),
          category: createForm.category,
          content: createForm.content.trim(),
          owner_id: userId,
          organisation_id: orgId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create policy');

      // Attach content so view works immediately
      setPolicies(prev => [{ ...data.data, content: createForm.content.trim() }, ...prev]);
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', category: '', content: '' });
      toast.success('Policy created');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── AI draft ──────────────────────────────────────────────────────────────
  const handleAIDraft = async (formSetter: React.Dispatch<React.SetStateAction<any>>, title: string, description: string, category: string) => {
    if (!title.trim()) return toast.error('Enter a policy title first');
    setAiDrafting(true);
    try {
      const res = await fetch('/api/ai/draft-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      formSetter((p: any) => ({ ...p, content: data.content }));
      toast.success('AI drafted your policy!');
    } catch (err: any) {
      toast.error(err.message || 'AI drafting failed');
    } finally {
      setAiDrafting(false);
    }
  };

  // ── Edit policy ───────────────────────────────────────────────────────────
  const openEdit = (policy: any) => {
    setEditingPolicy(policy);
    setEditForm({
      title: policy.title,
      description: policy.description || '',
      category: policy.category || '',
      content: policy.content || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const res = await fetch(`/api/policies/${editingPolicy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          category: editForm.category,
          content: editForm.content.trim(),
          change_summary: `Updated by ${userId}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPolicies(prev => prev.map(p =>
        p.id === editingPolicy.id
          ? { ...p, ...data.data, content: editForm.content.trim() }
          : p
      ));
      setShowEditModal(false);
      setEditingPolicy(null);
      toast.success('Policy saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Status update ─────────────────────────────────────────────────────────
  const handleStatusUpdate = async (policyId: string, status: string) => {
    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPolicies(prev => prev.map(p => p.id === policyId ? { ...p, status } : p));
      toast.success(`Policy marked as ${status}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Delete policy ─────────────────────────────────────────────────────────
  const handleDelete = async (policyId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/policies/${policyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPolicies(prev => prev.filter(p => p.id !== policyId));
      toast.success('Policy deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Acknowledge policy ────────────────────────────────────────────────────
  const handleAcknowledge = async () => {
    if (!ackPolicy) return;
    setAcknowledging(true);
    try {
      const res = await fetch('/api/policies/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: ackPolicy.id,
          version_number: ackPolicy.current_version,
          organisation_id: orgId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAckModal(false);
      setAckPolicy(null);
      toast.success('Policy acknowledged — your sign-off has been recorded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to acknowledge');
    } finally {
      setAcknowledging(false);
    }
  };

  // ── Use template ──────────────────────────────────────────────────────────
  const useTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
    setCreateForm({ title: template.name, description: template.description, category: template.category, content: '' });
    setActiveTab('all');
    setShowCreateModal(true);
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'all',       label: 'All',        icon: FileText    },
    { id: 'approved',  label: 'Approved',   icon: CheckCircle },
    { id: 'draft',     label: 'Drafts',     icon: Edit2       },
    { id: 'review',    label: 'In Review',  icon: Clock       },
    { id: 'templates', label: 'Templates',  icon: BookOpen    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px]',
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'
              )}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search policies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 w-48 text-xs"
            />
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4" /> New Policy
            </Button>
          )}
        </div>
      </div>

      {/* ── TEMPLATES TAB ──────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {POLICY_TEMPLATES.map((t: typeof POLICY_TEMPLATES[0], i: number) => (
            <Card
              key={i}
              className="card-hover cursor-pointer group"
              onClick={() => canEdit && useTemplate(t)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-brand-600" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{t.name}</h3>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                {canEdit && (
                  <div className="mt-3 flex items-center text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Use this template <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── POLICY LIST ────────────────────────────────────────────── */}
      {activeTab !== 'templates' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No policies found</p>
                {canEdit && activeTab === 'all' && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
                    + Create your first policy
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filtered.map(policy => (
              <Card key={policy.id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground truncate">{policy.title}</h3>
                        <span className={cn('status-badge capitalize', getStatusColor(policy.status))}>
                          {policy.status}
                        </span>
                        {policy.category && (
                          <span className="text-xs text-muted-foreground">{policy.category}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">v{policy.current_version}</span>
                        <span className="text-xs text-muted-foreground">Updated {formatDate(policy.updated_at)}</span>
                        {policy.owner && (
                          <span className="text-xs text-muted-foreground">
                            Owner: {policy.owner.full_name || policy.owner.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* View */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="View policy"
                        onClick={() => { setSelectedPolicy(policy); setShowViewModal(true); }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Edit */}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Edit policy"
                          onClick={() => openEdit(policy)}
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}

                      {/* Acknowledge */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Acknowledge this policy"
                        onClick={() => { setAckPolicy(policy); setShowAckModal(true); }}
                      >
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </Button>

                      {/* Approve */}
                      {canEdit && policy.status !== 'approved' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Approve policy"
                          onClick={() => handleStatusUpdate(policy.id, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}

                      {/* Send for review */}
                      {canEdit && policy.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Send for review"
                          onClick={() => handleStatusUpdate(policy.id, 'review')}
                        >
                          <Clock className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}

                      {/* Archive */}
                      {canAdmin && policy.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Archive policy"
                          onClick={() => handleStatusUpdate(policy.id, 'archived')}
                        >
                          <Archive className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}

                      {/* Delete */}
                      {canAdmin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete policy"
                          onClick={() => handleDelete(policy.id, policy.title)}
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CREATE MODAL                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Create Policy</h2>
              <button onClick={() => { setShowCreateModal(false); setCreateForm({ title: '', description: '', category: '', content: '' }); }} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Policy Title *</Label>
                <Input
                  value={createForm.title}
                  onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Data Protection & Privacy Policy"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={createForm.category} onValueChange={v => setCreateForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {POLICY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={createForm.description}
                  onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this policy..."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Policy Content</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    loading={aiDrafting}
                    onClick={() => handleAIDraft(setCreateForm, createForm.title, createForm.description, createForm.category)}
                  >
                    <Sparkles className="w-3 h-3" /> AI Draft
                  </Button>
                </div>
                <Textarea
                  value={createForm.content}
                  onChange={e => setCreateForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Write policy content here, or click AI Draft to auto-generate..."
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowCreateModal(false); setCreateForm({ title: '', description: '', category: '', content: '' }); }}>Cancel</Button>
              <Button onClick={handleCreate} loading={creating}>Create Policy</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* EDIT MODAL                                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showEditModal && editingPolicy && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Edit Policy</h2>
              <button onClick={() => { setShowEditModal(false); setEditingPolicy(null); }} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Policy Title *</Label>
                <Input
                  value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={editForm.category} onValueChange={v => setEditForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {POLICY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Policy Content</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    loading={aiDrafting}
                    onClick={() => handleAIDraft(setEditForm, editForm.title, editForm.description, editForm.category)}
                  >
                    <Sparkles className="w-3 h-3" /> AI Redraft
                  </Button>
                </div>
                <Textarea
                  value={editForm.content}
                  onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))}
                  rows={14}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingPolicy(null); }}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={saving}>
                <Save className="w-4 h-4" /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* VIEW MODAL                                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showViewModal && selectedPolicy && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">{selectedPolicy.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('status-badge capitalize', getStatusColor(selectedPolicy.status))}>
                    {selectedPolicy.status}
                  </span>
                  <span className="text-xs text-muted-foreground">v{selectedPolicy.current_version}</span>
                  {selectedPolicy.category && (
                    <span className="text-xs text-muted-foreground">{selectedPolicy.category}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowViewModal(false);
                      openEdit(selectedPolicy);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                )}
                <button onClick={() => setShowViewModal(false)} className="text-muted-foreground hover:text-foreground text-xl ml-2">✕</button>
              </div>
            </div>
            <div className="p-6">
              {selectedPolicy.description && (
                <p className="text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                  {selectedPolicy.description}
                </p>
              )}
              {selectedPolicy.content ? (
                <div className="prose-grc whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedPolicy.content}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No content yet.</p>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => { setShowViewModal(false); openEdit(selectedPolicy); }}
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Add Content
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ACKNOWLEDGE MODAL                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAckModal && ackPolicy && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Acknowledge Policy</h2>
              <button onClick={() => { setShowAckModal(false); setAckPolicy(null); }} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-semibold text-foreground">{ackPolicy.title}</p>
                <p className="text-xs text-muted-foreground mt-1">Version {ackPolicy.current_version}</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By acknowledging this policy, you confirm that you have read, understood, and agree to comply with its requirements. Your acknowledgement will be recorded with a timestamp.
              </p>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This is a legally recorded acknowledgement. Only acknowledge if you have genuinely read this policy.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowAckModal(false); setAckPolicy(null); }}>Cancel</Button>
              <Button onClick={handleAcknowledge} loading={acknowledging}>
                <CheckCircle className="w-4 h-4" /> I Have Read and Acknowledge This Policy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
