'use client';

import React, { useState } from 'react';
import { Users, Mail, Shield, Crown, Eye, UserPlus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/index';
import { cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const ROLE_CONFIG = {
  owner:   { label: 'Owner',   icon: Crown,  color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20',   description: 'Full access including billing' },
  admin:   { label: 'Admin',   icon: Shield, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',      description: 'Full access, no billing' },
  member:  { label: 'Member',  icon: Users,  color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20', description: 'Create and edit content' },
  auditor: { label: 'Auditor', icon: Eye,    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20', description: 'Read-only access' },
};

interface TeamContentProps {
  members: any[];
  currentUser: any;
  organisation: any;
  orgId: string;
  userRole: string;
}

export function TeamContent({
  members: initialMembers,
  currentUser,
  organisation,
  orgId,
  userRole,
}: TeamContentProps) {
  const [members, setMembers] = useState(initialMembers);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member', full_name: '' });
  const [inviting, setInviting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const canManage = ['owner', 'admin'].includes(userRole);

  // ── Invite member ─────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteForm.email.trim()) return toast.error('Email is required');
    if (!inviteForm.email.includes('@')) return toast.error('Enter a valid email address');
    setInviting(true);

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email.trim().toLowerCase(),
          role: inviteForm.role,
          full_name: inviteForm.full_name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite failed');

      toast.success(data.message || `Invitation sent to ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'member', full_name: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // ── Change role ───────────────────────────────────────────────────────────
  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingRole(memberId);
    try {
      const res = await fetch('/api/team/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Role update failed');

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast.success(`Role updated to ${newRole}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  };

  // ── Remove member ─────────────────────────────────────────────────────────
  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from your organisation? They will lose access immediately.`)) return;
    setRemoving(memberId);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ organisation_id: null, role: 'member' })
        .eq('id', memberId)
        .eq('organisation_id', orgId);

      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Team member removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Org info card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {organisation?.name?.[0]?.toUpperCase() || 'O'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground">{organisation?.name}</h2>
            <p className="text-xs text-muted-foreground">
              {[organisation?.industry, organisation?.size && `${organisation.size} employees`, organisation?.country]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-foreground">{members.length}</p>
            <p className="text-xs text-muted-foreground">member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </CardContent>
      </Card>

      {/* Members list header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
        {canManage && (
          <Button size="sm" onClick={() => setShowInviteModal(true)}>
            <UserPlus className="w-4 h-4" /> Invite Member
          </Button>
        )}
      </div>

      {/* Members list */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {members.map(member => {
            const roleConfig = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.member;
            const RoleIcon = roleConfig.icon;
            const isCurrentUser = member.id === currentUser?.id;
            const isOwner = member.role === 'owner';
            const isUpdating = updatingRole === member.id;
            const isRemoving = removing === member.id;

            return (
              <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(member.full_name?.[0] || member.email?.[0] || '?').toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.full_name || 'Unnamed User'}
                    </p>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  {member.job_title && (
                    <p className="text-xs text-muted-foreground">{member.job_title}</p>
                  )}
                </div>

                {/* Role badge */}
                <div className={cn(
                  'hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0',
                  roleConfig.color
                )}>
                  <RoleIcon className="w-3 h-3" />
                  {roleConfig.label}
                </div>

                {/* Actions — only for admins/owners on non-owner, non-self members */}
                {canManage && !isCurrentUser && !isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Select
                      value={member.role}
                      onValueChange={v => handleRoleChange(member.id, v)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="auditor">Auditor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveMember(member.id, member.email)}
                      disabled={isRemoving}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No team members yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(ROLE_CONFIG).map(([key, config]: [string, any]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="p-3 rounded-lg border border-border">
                  <div className={cn('flex items-center gap-1.5 mb-1 text-xs font-semibold', config.color.split(' ')[0])}>
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </div>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── INVITE MODAL ────────────────────────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Invite Team Member</h2>
              <button
                onClick={() => { setShowInviteModal(false); setInviteForm({ email: '', role: 'member', full_name: '' }); }}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="colleague@company.co.za"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label>Full Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  value={inviteForm.full_name}
                  onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Full access, no billing</SelectItem>
                    <SelectItem value="member">Member — Create and edit content</SelectItem>
                    <SelectItem value="auditor">Auditor — Read-only access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                They will receive an email with a secure link to create their account and join{' '}
                <strong>{organisation?.name}</strong>.
              </p>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t">
              <Button
                variant="outline"
                disabled={inviting}
                onClick={() => { setShowInviteModal(false); setInviteForm({ email: '', role: 'member', full_name: '' }); }}
              >
                Cancel
              </Button>
              <Button onClick={handleInvite} loading={inviting}>
                <Mail className="w-4 h-4" /> Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
