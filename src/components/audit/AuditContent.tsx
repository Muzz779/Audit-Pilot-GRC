'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, CheckCircle2, Clock, Plus, Download, FolderOpen,
  Shield, Calendar, BarChart3, AlertCircle, FileText, File,
  Loader2, ExternalLink, ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/index';
import { cn, formatDate, formatFileSize, getStatusColor, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { AnalyzeDocumentButton } from '@/components/audit/AnalyzeDocumentButton';

interface AuditContentProps {
  audits: any[];
  evidence: any[];
  frameworks: any[];
  orgId: string;
  userId: string;
  userRole: string;
}

type Tab = 'audits' | 'evidence' | 'reports';

export function AuditContent({
  audits: initialAudits,
  evidence: initialEvidence,
  frameworks,
  orgId,
  userId,
  userRole,
}: AuditContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>('evidence');
  const [audits, setAudits] = useState(initialAudits);
  const [evidence, setEvidence] = useState(initialEvidence);

  // Upload evidence modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadForm, setUploadForm] = useState({ name: '', description: '', tags: '' });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // New audit modal state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [savingAudit, setSavingAudit] = useState(false);
  const [auditForm, setAuditForm] = useState({
    title: '',
    description: '',
    framework_id: '',
    start_date: '',
    end_date: '',
    status: 'planned',
  });

  // Report state
  const [generatingReport, setGeneratingReport] = useState(false);

  const supabase = createClient();
  const canEdit = ['owner', 'admin', 'member', 'auditor'].includes(userRole);

  // ── Dropzone ────────────────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const code = rejectedFiles[0].errors[0]?.code;
      if (code === 'file-too-large') toast.error('File too large — max 50MB');
      else toast.error('File type not supported');
      return;
    }
    if (acceptedFiles[0]) {
      setUploadedFile(acceptedFiles[0]);
      setUploadForm(p => ({
        ...p,
        name: p.name || acceptedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 52428800,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
  });

  // ── Upload evidence handler ─────────────────────────────────────────────
  const handleUploadEvidence = async () => {
    if (!uploadForm.name.trim()) return toast.error('Evidence name is required');
    setUploading(true);

    try {
      let fileUrl: string | null = null;

      if (uploadedFile) {
        setUploadProgress('Uploading file to storage...');
        const timestamp = Date.now();
        const safeName = uploadedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${orgId}/${timestamp}-${safeName}`;

        const { data: storageData, error: storageError } = await supabase.storage
          .from('evidence')
          .upload(storagePath, uploadedFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: uploadedFile.type,
          });

        if (storageError) {
          // If bucket missing, continue with metadata-only save
          console.warn('Storage warning:', storageError.message);
          if (storageError.message?.includes('Bucket not found') || storageError.message?.includes('not found')) {
            toast('Storage bucket not found — saving metadata only. Re-run schema.sql in Supabase to fix.', { icon: '⚠️' });
          }
        } else {
          // Store the storage PATH, never a public URL — the `evidence` bucket is private.
          // Downloads are served through short-lived signed URLs via /api/evidence/[id]/download.
          fileUrl = storageData.path;
        }
      }

      setUploadProgress('Saving record...');

      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadForm.name.trim(),
          description: uploadForm.description.trim(),
          file_url: fileUrl,
          file_name: uploadedFile?.name,
          file_size: uploadedFile?.size,
          file_type: uploadedFile?.type,
          tags: uploadForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          organisation_id: orgId,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setEvidence(prev => [data.data, ...prev]);
      setShowUploadModal(false);
      setUploadedFile(null);
      setUploadForm({ name: '', description: '', tags: '' });
      toast.success(fileUrl ? 'Evidence uploaded ✅' : 'Evidence record saved');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // ── Create audit handler ────────────────────────────────────────────────
  const handleCreateAudit = async () => {
    if (!auditForm.title.trim()) return toast.error('Audit title is required');
    setSavingAudit(true);

    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: auditForm.title.trim(),
          description: auditForm.description.trim(),
          framework_id: auditForm.framework_id || null,
          start_date: auditForm.start_date || null,
          end_date: auditForm.end_date || null,
          status: auditForm.status,
          organisation_id: orgId,
          lead_id: userId,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAudits(prev => [data.data, ...prev]);
      setShowAuditModal(false);
      setAuditForm({ title: '', description: '', framework_id: '', start_date: '', end_date: '', status: 'planned' });
      toast.success('Audit created successfully ✅');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create audit');
    } finally {
      setSavingAudit(false);
    }
  };

  // ── Generate & download report ──────────────────────────────────────────
  const handleGenerateReport = async (auditId?: string) => {
    setGeneratingReport(true);
    try {
      const res = await fetch('/api/audit-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_id: auditId, org_id: orgId }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.report_html) {
        // Create a blob and trigger a real download / new tab open
        const blob = new Blob([data.report_html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // Open in new tab — user can Ctrl+P → Save as PDF from there
        const win = window.open(url, '_blank');
        if (!win) {
          // Popup blocked — fall back to download link
          const link = document.createElement('a');
          link.href = url;
          link.download = `ComplianceReport_${new Date().toISOString().split('T')[0]}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('Report downloaded — open in browser and Ctrl+P to save as PDF');
        } else {
          toast.success('Report opened in new tab — use Ctrl+P to save as PDF 📄');
        }

        // Clean up the object URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        toast.error('No report data returned — try again');
      }
    } catch (err: any) {
      toast.error(err.message || 'Report generation failed');
    } finally {
      setGeneratingReport(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const fileEmoji = (type?: string) => {
    if (!type) return '📎';
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('sheet') || type.includes('csv')) return '📊';
    return '📎';
  };

  const statusIcons: Record<string, React.ElementType> = {
    planned: Calendar,
    in_progress: Clock,
    completed: CheckCircle2,
    cancelled: AlertCircle,
  };

  const evidenceStatusColors: Record<string, string> = {
    uploaded: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    verified: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    pending: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    expired: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Tab bar + action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['evidence', 'audits', 'reports'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === tab
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'evidence' ? '📁 Evidence Repository' : tab === 'audits' ? '📋 Audits' : '📊 Reports'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'evidence' && canEdit && (
            <Button size="sm" onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4" /> Upload Evidence
            </Button>
          )}
          {activeTab === 'audits' && canEdit && (
            <Button size="sm" onClick={() => setShowAuditModal(true)}>
              <Plus className="w-4 h-4" /> New Audit
            </Button>
          )}
          {activeTab === 'reports' && (
            <Button size="sm" onClick={() => handleGenerateReport()} loading={generatingReport}>
              <Download className="w-4 h-4" /> Generate Report
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Evidence', value: evidence.length, icon: FolderOpen, color: 'text-brand-600 bg-brand-50' },
          { label: 'Uploaded', value: evidence.filter(e => e.status === 'uploaded').length, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Pending', value: evidence.filter(e => e.status === 'pending').length, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Active Audits', value: audits.filter(a => a.status === 'in_progress').length, icon: Shield, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
        ].map(s => (
          <Card key={s.label} className="card-hover">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', s.color)}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── EVIDENCE TAB ─────────────────────────────────────────── */}
      {activeTab === 'evidence' && (
        <>
          {evidence.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground mb-1">No evidence uploaded yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Upload certificates, policies, reports and supporting documents
                </p>
                {canEdit && (
                  <Button onClick={() => setShowUploadModal(true)}>
                    <Upload className="w-4 h-4" /> Upload First Evidence
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {evidence.map(ev => (
                <Card key={ev.id} className="card-hover group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0 mt-0.5">{fileEmoji(ev.file_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{ev.name}</p>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                            evidenceStatusColors[ev.status] || 'text-gray-600 bg-gray-100'
                          )}>
                            {ev.status === 'uploaded' && '✓ '}
                            {ev.status === 'pending' && '⏳ '}
                            {ev.status}
                          </span>
                          {ev.file_size && (
                            <span className="text-[10px] text-muted-foreground">{formatFileSize(ev.file_size)}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{timeAgo(ev.created_at)}</span>
                        </div>
                        {ev.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {ev.tags.slice(0, 4).map((tag: string) => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2.5 pt-2.5 border-t border-border/50">
                          <AnalyzeDocumentButton evidenceId={ev.id} hasFile={!!ev.file_url} />
                        </div>
                        {ev.file_url && (
                          <a
                            href={`/api/evidence/${ev.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 flex items-center gap-1 text-[11px] text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-3 h-3" /> View file
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── AUDITS TAB ───────────────────────────────────────────── */}
      {activeTab === 'audits' && (
        <div className="space-y-3">
          {audits.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-muted-foreground mb-1">No audits yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Schedule an audit to start tracking findings and evidence
                </p>
                {canEdit && (
                  <Button onClick={() => setShowAuditModal(true)}>
                    <Plus className="w-4 h-4" /> Create First Audit
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            audits.map(audit => {
              const StatusIcon = statusIcons[audit.status] || Clock;
              return (
                <Card key={audit.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <StatusIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold">{audit.title}</h3>
                          <span className={cn('status-badge', getStatusColor(audit.status))}>
                            {audit.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {audit.framework && (
                            <span className="text-xs text-muted-foreground">
                              {audit.framework.icon} {audit.framework.short_name}
                            </span>
                          )}
                          {audit.start_date && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(audit.start_date)}
                              {audit.end_date ? ` – ${formatDate(audit.end_date)}` : ' – ongoing'}
                            </span>
                          )}
                          {audit.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {audit.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(audit.id)}
                        loading={generatingReport}
                        className="shrink-0 text-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── REPORTS TAB ──────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">Compliance Summary Report</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-6">
              Generates a full HTML report of your compliance scores, risk register, policies and evidence.
              Opens in a new tab — use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+P</kbd> → Save as PDF.
            </p>
            <Button onClick={() => handleGenerateReport()} loading={generatingReport} size="lg">
              <Download className="w-4 h-4" /> Generate & Open Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* UPLOAD EVIDENCE MODAL                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Upload Evidence</h2>
              <button
                onClick={() => { setShowUploadModal(false); setUploadedFile(null); setUploadForm({ name: '', description: '', tags: '' }); }}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-primary bg-primary/5' :
                  uploadedFile ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' :
                  'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <input {...getInputProps()} />
                {uploadedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">{fileEmoji(uploadedFile.type)}</span>
                    <p className="text-sm font-semibold">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setUploadedFile(null); }}
                      className="text-xs text-rose-500 hover:text-rose-700 mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">
                      {isDragActive ? 'Drop it here' : 'Drag & drop or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, Word, Excel, CSV, Images — max 50MB
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Evidence Name *</Label>
                <Input
                  value={uploadForm.name}
                  onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. POPIA Data Protection Policy v2.1"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={uploadForm.description}
                  onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What does this evidence demonstrate?"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                <Input
                  value={uploadForm.tags}
                  onChange={e => setUploadForm(p => ({ ...p, tags: e.target.value }))}
                  placeholder="e.g. popia, certificate, 2025"
                />
              </div>

              {uploading && uploadProgress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  {uploadProgress}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-6 border-t">
              <Button
                variant="outline"
                disabled={uploading}
                onClick={() => { setShowUploadModal(false); setUploadedFile(null); setUploadForm({ name: '', description: '', tags: '' }); }}
              >
                Cancel
              </Button>
              <Button onClick={handleUploadEvidence} loading={uploading}>
                <Upload className="w-4 h-4" />
                {uploadedFile ? 'Upload Evidence' : 'Save Record'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* NEW AUDIT MODAL  ← this was completely missing before      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Create New Audit</h2>
              <button
                onClick={() => { setShowAuditModal(false); setAuditForm({ title: '', description: '', framework_id: '', start_date: '', end_date: '', status: 'planned' }); }}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Audit Title *</Label>
                <Input
                  value={auditForm.title}
                  onChange={e => setAuditForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Annual POPIA Compliance Audit 2025"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={auditForm.description}
                  onChange={e => setAuditForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Scope and objectives of this audit..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Framework</Label>
                  <Select
                    value={auditForm.framework_id}
                    onValueChange={v => setAuditForm(p => ({ ...p, framework_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific framework</SelectItem>
                      {frameworks.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.icon} {f.short_name || f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={auditForm.status}
                    onValueChange={v => setAuditForm(p => ({ ...p, status: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={auditForm.start_date}
                    onChange={e => setAuditForm(p => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={auditForm.end_date}
                    onChange={e => setAuditForm(p => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t">
              <Button
                variant="outline"
                disabled={savingAudit}
                onClick={() => { setShowAuditModal(false); setAuditForm({ title: '', description: '', framework_id: '', start_date: '', end_date: '', status: 'planned' }); }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateAudit} loading={savingAudit}>
                <Plus className="w-4 h-4" /> Create Audit
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
