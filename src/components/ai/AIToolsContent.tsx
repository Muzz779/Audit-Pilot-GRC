'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, FileText, AlertTriangle, Newspaper, Send, Sparkles,
  Lock, Loader2, Copy, Check, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, Input, Textarea, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/index';
import { cn, POLICY_CATEGORIES, RISK_CATEGORIES } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

type Tool = 'chat' | 'policy' | 'risk' | 'regulatory';

interface AIToolsContentProps {
  subscription: any;
  orgId: string;
  userId: string;
  orgContext: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AIToolsContent({ subscription, orgId, userId, orgContext }: AIToolsContentProps) {
  const [activeTool, setActiveTool] = useState<Tool>('chat');
  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'enterprise';

  const tools = [
    { id: 'chat' as Tool,       label: 'GRC Assistant',     icon: Bot,           description: 'Ask anything about compliance & governance', free: true  },
    { id: 'policy' as Tool,     label: 'Policy Drafter',    icon: FileText,      description: 'AI-generated policies from description',      free: false },
    { id: 'risk' as Tool,       label: 'Risk Assessor',     icon: AlertTriangle, description: 'AI risk scoring and mitigation advice',        free: false },
    { id: 'regulatory' as Tool, label: 'Regulatory Scanner', icon: Newspaper,    description: 'Simulate regulatory change alerts',            free: false },
  ];

  const isLocked = (tool: typeof tools[0]) => !tool.free && !isPro;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Tool selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={cn(
              'text-left p-4 rounded-xl border transition-all relative',
              activeTool === tool.id
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:bg-muted'
            )}
          >
            {isLocked(tool) && (
              <Lock className="absolute top-3 right-3 w-3.5 h-3.5 text-muted-foreground" />
            )}
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center mb-3',
              activeTool === tool.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              <tool.icon className="w-4 h-4" />
            </div>
            <p className="text-sm font-semibold text-foreground">{tool.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
            <div className="mt-2">
              {tool.free
                ? <Badge variant="success" className="text-[10px]">Free</Badge>
                : <Badge variant={isPro ? 'info' : 'secondary'} className="text-[10px]">Pro</Badge>
              }
            </div>
          </button>
        ))}
      </div>

      {/* Upgrade banner for locked tools */}
      {isLocked(tools.find(t => t.id === activeTool)!) && (
        <div className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 p-4 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Pro feature — Upgrade to unlock</p>
              <p className="text-xs text-white/80">
                AI Policy Drafter, Risk Assessor and Regulatory Scanner require a Pro plan
              </p>
            </div>
          </div>
          <Link href="/settings/billing">
            <Button size="sm" className="bg-white text-brand-700 hover:bg-white/90 shrink-0">
              Upgrade — R799/mo
            </Button>
          </Link>
        </div>
      )}

      {/* Tool panels */}
      {activeTool === 'chat' && (
        <ChatPanel orgContext={orgContext} />
      )}
      {activeTool === 'policy' && isPro && (
        <PolicyDrafterPanel orgId={orgId} />
      )}
      {activeTool === 'risk' && isPro && (
        <RiskAssessorPanel orgId={orgId} />
      )}
      {activeTool === 'regulatory' && isPro && (
        <RegulatoryPanel orgId={orgId} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ChatPanel({ orgContext }: { orgContext: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Hi! I\'m your GRC assistant powered by Claude. Ask me anything about POPIA, ISO 27001, risk management, compliance frameworks, or South African regulations. How can I help?',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          orgContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (err: any) {
      toast.error('Failed to get response — check your Anthropic API key');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check that your Anthropic API key is configured correctly.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTED = [
    'What are the key POPIA requirements for financial services companies?',
    'How do I calculate a risk score using likelihood and impact?',
    'What is the difference between SOC 2 Type I and Type II?',
    'What controls are needed for ISO 27001 certification?',
  ];

  return (
    <Card className="flex flex-col" style={{ height: '65vh' }}>
      <CardHeader className="pb-3 shrink-0 border-b">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">GRC Assistant</CardTitle>
            <CardDescription className="text-xs">Powered by Claude — Ask anything about compliance</CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg: ChatMessage, i: number) => (
          <div key={i} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
              msg.role === 'assistant'
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'bg-muted text-muted-foreground'
            )}>
              {msg.role === 'assistant' ? '🤖' : 'U'}
            </div>
            <div className={cn(
              'max-w-[80%] rounded-xl px-3 py-2.5 text-sm leading-relaxed',
              msg.role === 'assistant'
                ? 'bg-muted text-foreground'
                : 'bg-primary text-primary-foreground'
            )}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs shrink-0">
              🤖
            </div>
            <div className="bg-muted rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        {/* Suggested questions — only on first message */}
        {messages.length === 1 && !loading && (
          <div className="space-y-2 mt-2">
            <p className="text-xs text-muted-foreground font-medium">Suggested questions:</p>
            {SUGGESTED.map((s: string, i: number) => (
              <button
                key={i}
                onClick={() => setInput(s)}
                className="block w-full text-left text-xs text-muted-foreground hover:text-foreground p-2.5 rounded-lg hover:bg-muted border border-dashed border-border transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about POPIA, ISO 27001, risk management..."
            className="text-sm"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POLICY DRAFTER PANEL
// ─────────────────────────────────────────────────────────────────────────────
function PolicyDrafterPanel({ orgId }: { orgId: string }) {
  const [form, setForm] = useState({ title: '', description: '', category: '', industry: '' });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDraft = async () => {
    if (!form.title.trim()) return toast.error('Policy title is required');
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/ai/draft-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to draft policy');
      setResult(data.content);
      toast.success('Policy drafted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'AI drafting failed — check your Anthropic API key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" /> Policy Details
          </CardTitle>
          <CardDescription className="text-xs">
            Describe your policy and AI will write a professional draft
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Policy Title *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Data Protection & Privacy Policy"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {POLICY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Input
                value={form.industry}
                onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                placeholder="e.g. Financial Services"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description / Key Requirements</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe what this policy should cover, any specific POPIA or ISO 27001 alignment requirements, your company context..."
              rows={4}
            />
          </div>

          <Button onClick={handleDraft} loading={loading} className="w-full">
            <Sparkles className="w-4 h-4" /> Draft Policy with AI
          </Button>
        </CardContent>
      </Card>

      {/* Output panel */}
      <Card className="flex flex-col" style={{ minHeight: '400px' }}>
        <CardHeader className="pb-3 shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Generated Policy</CardTitle>
            {result && (
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs h-7">
                {copied
                  ? <><Check className="w-3 h-3" /> Copied</>
                  : <><Copy className="w-3 h-3" /> Copy</>
                }
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Drafting your policy...</p>
              <p className="text-xs">This usually takes 10–20 seconds</p>
            </div>
          ) : result ? (
            <div className="prose-grc text-sm whitespace-pre-wrap leading-relaxed">{result}</div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Sparkles className="w-8 h-8 opacity-30" />
              <p className="text-sm">Fill in the details and click Draft</p>
              <p className="text-xs">AI will generate a full professional policy</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK ASSESSOR PANEL
// ─────────────────────────────────────────────────────────────────────────────
function RiskAssessorPanel({ orgId }: { orgId: string }) {
  const [form, setForm] = useState({ title: '', description: '', category: '' });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAssess = async () => {
    if (!form.title.trim()) return toast.error('Risk title is required');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/assess-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assessment failed');
      setResult(data);
      toast.success('Risk assessed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'AI assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = result
    ? result.score >= 17 ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
    : result.score >= 10 ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
    : result.score >= 5  ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
    : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
    : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Risk Details
          </CardTitle>
          <CardDescription className="text-xs">
            Describe a risk and AI will score it and suggest mitigations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Risk Title *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Ransomware attack on production servers"
              autoFocus
            />
          </div>
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
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the risk in detail — what could happen, how it might occur, what would be affected..."
              rows={5}
            />
          </div>
          <Button onClick={handleAssess} loading={loading} className="w-full">
            <Sparkles className="w-4 h-4" /> Assess Risk with AI
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm">AI Assessment Result</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Analysing risk...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Score row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-xs text-muted-foreground mb-1">Likelihood</p>
                  <p className="text-sm font-bold capitalize text-foreground">{result.likelihood}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-xs text-muted-foreground mb-1">Impact</p>
                  <p className="text-sm font-bold capitalize text-foreground">{result.impact}</p>
                </div>
                <div className={cn('p-3 rounded-lg text-center', scoreColor)}>
                  <p className="text-xs mb-1 opacity-80">Score</p>
                  <p className="text-2xl font-black">
                    {result.score}
                    <span className="text-xs font-normal">/25</span>
                  </p>
                </div>
              </div>

              {/* Rationale */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5">Assessment Rationale</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.rationale}</p>
              </div>

              {/* Mitigations */}
              {result.mitigations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Recommended Mitigations</p>
                  <ul className="space-y-2">
                    {result.mitigations.map((m: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Relevant frameworks */}
              {result.frameworks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5">Relevant Frameworks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.frameworks.map((f: string) => (
                      <span key={f} className="text-xs px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <AlertTriangle className="w-8 h-8 opacity-30" />
              <p className="text-sm">Fill in risk details to assess</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGULATORY SCANNER PANEL
// ─────────────────────────────────────────────────────────────────────────────
function RegulatoryPanel({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/regulatory-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setResult(data);
      setLastScanned(new Date().toLocaleTimeString('en-ZA'));
      toast.success(`Regulatory scan complete — ${data.alerts?.length || 0} alerts found`);
    } catch (err: any) {
      toast.error(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const severityStyles: Record<string, string> = {
    critical: 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800',
    high:     'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800',
    medium:   'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800',
    low:      'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800',
  };

  const severityBadge: Record<string, string> = {
    critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    high:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="space-y-6">
      {/* Trigger card */}
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-semibold text-foreground mb-1">Regulatory Change Scanner</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-lg mx-auto">
            Simulates scanning for recent regulatory changes, POPIA updates, and compliance alerts
            relevant to your organisation and active frameworks.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={handleScan} loading={loading} size="lg">
              <Sparkles className="w-4 h-4" />
              {result ? 'Re-scan Regulations' : 'Run Regulatory Scan'}
            </Button>
            {result && (
              <Button variant="outline" size="lg" onClick={handleScan} loading={loading}>
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            )}
          </div>
          {lastScanned && (
            <p className="text-xs text-muted-foreground mt-3">Last scanned: {lastScanned}</p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {result?.summary && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-1.5">Regulatory Landscape Summary</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Alert cards */}
      {result?.alerts && result.alerts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            {result.alerts.length} Alert{result.alerts.length !== 1 ? 's' : ''} Found
          </p>
          {result.alerts.map((alert: any, i: number) => (
            <div
              key={i}
              className={cn('rounded-xl border p-4', severityStyles[alert.severity] || 'bg-muted border-border')}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 mt-0.5',
                  severityBadge[alert.severity]
                )}>
                  {alert.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-semibold text-foreground">{alert.title}</h4>
                    <span className="text-xs px-2 py-0.5 bg-white/60 dark:bg-black/20 rounded text-muted-foreground">
                      {alert.framework}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    {alert.description}
                  </p>
                  <div className="p-2 bg-white/50 dark:bg-black/20 rounded text-xs">
                    <span className="font-semibold text-foreground">Action Required: </span>
                    <span className="text-muted-foreground">{alert.action_required}</span>
                    {alert.deadline && (
                      <span className="ml-2 text-muted-foreground font-medium">· Deadline: {alert.deadline}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result?.alerts?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium text-foreground mb-1">No alerts found</p>
            <p className="text-xs text-muted-foreground">Your compliance position looks good based on current regulations.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
