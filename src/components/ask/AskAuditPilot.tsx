'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, FileText, BookOpen, AlertTriangle,
  ChevronDown, ChevronUp, ShieldAlert, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/index';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Citation {
  label: string;
  similarity: number;
  excerpt: string;
  // document citation fields
  document_name?: string;
  page_number?: number | null;
  section_title?: string | null;
  // regulation citation fields
  section_reference?: string;
  title?: string;
  is_verified?: boolean;
}

interface QueryResult {
  question: string;
  answer: string;
  citations: { documents: Citation[]; regulations: Citation[] };
  had_sufficient_evidence: boolean;
}

export function AskAuditPilot({ orgId }: { orgId: string }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<QueryResult[]>([]);
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || loading) return;

    setLoading(true);
    setQuestion('');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to get an answer');

      setHistory(prev => [...prev, {
        question: q,
        answer: data.answer,
        citations: data.citations,
        had_sufficient_evidence: data.had_sufficient_evidence,
      }]);
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setQuestion(q); // restore the question so they don't lose it
    } finally {
      setLoading(false);
    }
  };

  const toggleCitations = (index: number) => {
    setExpandedCitations(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const SUGGESTED = [
    'Do we have a documented breach notification procedure?',
    'What evidence do we have for data retention practices?',
    'Have we documented our lawful basis for processing personal information?',
  ];

  return (
    <Card className="flex flex-col" style={{ height: '70vh' }}>
      <CardHeader className="pb-3 shrink-0 border-b">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-brand-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm">Ask AuditPilot</CardTitle>
            <CardDescription className="text-xs">
              Answers are grounded in your analyzed documents and the regulation knowledge base — every claim is cited
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {history.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-border p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This is different from the general GRC chat assistant. Ask AuditPilot only answers using:
                (1) documents you've uploaded and analyzed in Audit & Evidence, and (2) the regulation knowledge base.
                If the evidence isn't there, it will tell you instead of guessing.
              </p>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Try asking:</p>
            {SUGGESTED.map((s: string, i: number) => (
              <button
                key={i}
                onClick={() => setQuestion(s)}
                className="block w-full text-left text-xs text-muted-foreground hover:text-foreground p-2.5 rounded-lg hover:bg-muted border border-dashed border-border transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {history.map((result: QueryResult, i: number) => (
          <div key={i} className="space-y-3">
            {/* Question */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-primary text-primary-foreground rounded-xl px-3 py-2 text-sm">
                {result.question}
              </div>
            </div>

            {/* Answer */}
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs shrink-0 mt-0.5">
                🔍
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className={cn(
                  'rounded-xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  result.had_sufficient_evidence ? 'bg-muted text-foreground' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-300'
                )}>
                  {!result.had_sufficient_evidence && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Insufficient evidence
                    </div>
                  )}
                  {result.answer}
                </div>

                {/* Citations toggle */}
                {(result.citations.documents.length > 0 || result.citations.regulations.length > 0) && (
                  <div>
                    <button
                      onClick={() => toggleCitations(i)}
                      className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                    >
                      {expandedCitations[i] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {result.citations.documents.length + result.citations.regulations.length} source{(result.citations.documents.length + result.citations.regulations.length) !== 1 ? 's' : ''} used
                    </button>

                    {expandedCitations[i] && (
                      <div className="mt-2 space-y-2">
                        {result.citations.documents.map((cite: Citation, j: number) => (
                          <div key={j} className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">{cite.label}</span>
                                <span className="text-xs font-medium text-foreground truncate">{cite.document_name}</span>
                                {cite.page_number && (
                                  <span className="text-[10px] text-muted-foreground">Page {cite.page_number}</span>
                                )}
                                {cite.section_title && (
                                  <span className="text-[10px] text-muted-foreground truncate">· {cite.section_title}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">{cite.similarity}% match</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1 italic">"{cite.excerpt}"</p>
                            </div>
                          </div>
                        ))}

                        {result.citations.regulations.map((cite: Citation, j: number) => (
                          <div key={j} className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                            <BookOpen className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">{cite.label}</span>
                                <span className="text-xs font-medium text-foreground">{cite.section_reference}: {cite.title}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto">{cite.similarity}% match</span>
                              </div>
                              {!cite.is_verified && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                                  <ShieldAlert className="w-3 h-3" /> Unverified — drafted from public text, not yet legally reviewed
                                </div>
                              )}
                              <p className="text-[11px] text-muted-foreground mt-1 italic">"{cite.excerpt}"</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs shrink-0">🔍</div>
            <div className="bg-muted rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Searching your documents and regulations...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            placeholder="Ask a question grounded in your evidence and regulations..."
            className="text-sm"
            disabled={loading}
          />
          <Button size="icon" onClick={handleAsk} disabled={!question.trim() || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
