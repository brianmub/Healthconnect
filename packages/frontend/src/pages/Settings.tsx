import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Select, Spinner, Modal } from '../components/ui';
import { useForm } from 'react-hook-form';
import {
  Building,
  Smartphone,
  MessageSquare,
  Users as UsersIcon,
  Shield,
  Send,
  Save,
  History,
  Search,
  RefreshCw,
  Copy,
  Check,
  Info,
  Edit2,
  X,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';

export default function Settings() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'profile' | 'sms' | 'whatsapp' | 'users' | 'sms-logs'>('profile');
  const [testPhone, setTestPhone] = useState('');
  const [testMsg, setTestMsg] = useState('This is a test notification from HealthConnect.');

  // Search and filter states for SMS Logs
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // User role editing states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<'ADMIN' | 'STAFF'>('STAFF');

  // User password editing states
  const [changePasswordUser, setChangePasswordUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Message ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/api/settings');
      return data;
    },
  });

  // Fetch SMS logs
  const { data: logs, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['settings', 'sms-logs'],
    queryFn: async () => {
      const { data } = await api.get('/api/settings/sms/logs');
      return data;
    },
    enabled: activeTab === 'sms-logs',
  });

  // Filter logs based on search and selected filter values
  const filteredLogs = logs?.filter((log: any) => {
    const matchesSearch = 
      log.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.msgId && log.msgId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || log.provider === providerFilter;

    return matchesSearch && matchesStatus && matchesProvider;
  }) || [];

  // Fetch users (only if admin)
  const { data: usersList, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: async () => {
      const { data } = await api.get('/api/settings/users');
      return data;
    },
    enabled: isAdmin && activeTab === 'users',
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/api/settings/users', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('New user account created successfully.');
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create user account.');
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'ADMIN' | 'STAFF' }) => {
      const { data } = await api.put(`/api/settings/users/${id}/role`, { role });
      return data;
    },
    onSuccess: () => {
      toast.success('User role updated successfully.');
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update user role.');
    },
  });

  // Update user password mutation
  const updateUserPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const { data } = await api.put(`/api/settings/users/${id}/password`, { password });
      return data;
    },
    onSuccess: () => {
      toast.success('User password updated successfully.');
      setChangePasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update user password.');
    },
  });

  const handleAddUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      password: data.get('password'),
      role: data.get('role'),
    };
    createUserMutation.mutate(payload, {
      onSuccess: () => {
        form.reset();
      },
    });
  };

  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.put('/api/settings', payload);
      return data;
    },
    onSuccess: () => {
      toast.success('Configuration settings updated.');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save settings.');
    },
  });

  // Test SMS mutation
  const testSmsMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/settings/sms/test', {
        phone: testPhone,
        message: testMsg,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Test SMS successfully dispatched.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to dispatch test SMS.');
    },
  });

  // Test WhatsApp mutation
  const testWhatsappMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/settings/whatsapp/test', {
        phone: testPhone,
        message: testMsg,
      });
      return data;
    },
    onSuccess: () => {
      toast.success('Test WhatsApp message successfully dispatched.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to dispatch test WhatsApp message.');
    },
  });

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Spinner className="w-8 h-8" />
        <span className="text-xs text-slate-500">Retrieving system settings...</span>
      </div>
    );
  }

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      clinicName: data.get('clinicName'),
      clinicPhone: data.get('clinicPhone'),
      clinicAddress: data.get('clinicAddress'),
      defaultCountryCode: data.get('defaultCountryCode'),
    };
    updateSettingsMutation.mutate(payload);
  };

  const handleSmsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      smsLocalhostApiKey: data.get('smsLocalhostApiKey'),
      smsLocalhostSenderId: data.get('smsLocalhostSenderId'),
    };
    updateSettingsMutation.mutate(payload);
  };

  const handleWhatsappSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      twilioWhatsappNumber: data.get('twilioWhatsappNumber'),
      metaWhatsappPhoneId: data.get('metaWhatsappPhoneId'),
      metaWhatsappToken: data.get('metaWhatsappToken'),
    };
    updateSettingsMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          System Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Update practice metadata, configure Twilio connections, and manage access roles.
          Reply <strong>STOP</strong> to opt-out.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1 pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="h-4 w-4" /> Practice Profile
        </button>
        <button
          onClick={() => setActiveTab('sms')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'sms'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="h-4 w-4" /> SMS Integration
        </button>
        <button
          onClick={() => setActiveTab('sms-logs')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'sms-logs'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" /> SMS Logs
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'whatsapp'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="h-4 w-4" /> WhatsApp Gateway
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UsersIcon className="h-4 w-4" /> User Accounts
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Clinic Profile */}
          {activeTab === 'profile' && (
            <Card>
              <h3 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider">Clinic Metadata</h3>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <Input label="Clinic Name" name="clinicName" defaultValue={settings?.clinicName} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Clinic Contact Phone" name="clinicPhone" defaultValue={settings?.clinicPhone} />
                  <Input label="Default Country Code" name="defaultCountryCode" defaultValue={settings?.defaultCountryCode || 'ZW'} />
                </div>
                <Input label="Clinic Street Address" name="clinicAddress" defaultValue={settings?.clinicAddress} />
                
                <div className="pt-3 border-t border-slate-900 flex justify-end">
                  <Button variant="primary" type="submit" isLoading={updateSettingsMutation.isPending}>
                    <Save className="h-4 w-4 mr-1.5" /> Save Profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* 2. SMS Gateway settings */}
          {activeTab === 'sms' && (
            <form onSubmit={handleSmsSubmit} className="space-y-4">
              {/* SMS Localhost card */}
              <Card className="border-primary-800/40 bg-primary-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary-500/20 text-primary-400">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">SMS Localhost</h3>
                    <p className="text-[10px] text-slate-500">sms.localhost.co.zw — recommended for Zimbabwe</p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold text-primary-400 bg-primary-500/10 border border-primary-700/40 px-2 py-0.5 rounded">Active Provider</span>
                </div>
                <div className="space-y-4">
                  <Input
                    label="API Key"
                    name="smsLocalhostApiKey"
                    type="password"
                    defaultValue={settings?.smsLocalhostApiKey || ''}
                    placeholder="••••••••••••••••"
                  />
                  <Input
                    label="Sender ID (3–11 alphanumeric chars, must be approved)"
                    name="smsLocalhostSenderId"
                    defaultValue={settings?.smsLocalhostSenderId || ''}
                    placeholder="e.g. HealthConn"
                  />
                  <p className="text-[10px] text-slate-500">
                    Set <code className="bg-slate-800 px-1 rounded">SMS_PROVIDER=smsLocalhost</code> in your <code className="bg-slate-800 px-1 rounded">.env</code> to activate.
                    Get your API key from your{' '}
                    <a href="https://sms.localhost.co.zw" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">SMS Localhost dashboard</a>.
                  </p>
                </div>
              </Card>

              <div className="pt-1 flex justify-end">
                <Button variant="primary" type="submit" isLoading={updateSettingsMutation.isPending}>
                  <Save className="h-4 w-4 mr-1.5" /> Save SMS config
                </Button>
              </div>
            </form>
          )}

          {/* 3. WhatsApp Integration settings */}
          {activeTab === 'whatsapp' && (
            <Card>
              <h3 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wider">WhatsApp Gateway Details</h3>
              <form onSubmit={handleWhatsappSubmit} className="space-y-4">
                <Input label="Twilio WhatsApp Sender (e.g. whatsapp:+1415...)" name="twilioWhatsappNumber" defaultValue={settings?.twilioWhatsappNumber} />
                <div className="border-t border-slate-900 my-6 pt-4">
                  <span className="block text-xs font-bold text-slate-400 mb-2 uppercase">Meta Cloud API (Alternative Stub)</span>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Meta WhatsApp Phone ID" name="metaWhatsappPhoneId" defaultValue={settings?.metaWhatsappPhoneId || ''} />
                    <Input label="Meta WhatsApp API Token" name="metaWhatsappToken" type="password" defaultValue={settings?.metaWhatsappToken || ''} placeholder="••••••••" />
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-900 flex justify-end">
                  <Button variant="primary" type="submit" isLoading={updateSettingsMutation.isPending}>
                    <Save className="h-4 w-4 mr-1.5" /> Save WhatsApp details
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* 4. Users list */}
          {activeTab === 'users' && isAdmin && (
            <Card className="p-0 overflow-hidden">
              <div className="p-6 border-b border-slate-850 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">User Administration</h3>
                <Badge color="primary">Active Team</Badge>
              </div>
              {isLoadingUsers ? (
                <div className="p-8 flex flex-col items-center justify-center gap-3">
                  <Spinner className="w-6 h-6" />
                  <span className="text-xs text-slate-500">Loading user accounts...</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {usersList?.map((u: any) => {
                    const isEditing = editingUserId === u.id;
                    const isCurrentUser = u.id === user?.id;

                    return (
                      <div key={u.email} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-bold text-slate-400">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 text-xs block">{u.name}</span>
                            <span className="text-[10px] text-slate-500">{u.email}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 animate-fade-in">
                              <select
                                value={editingUserRole}
                                onChange={(e) => setEditingUserRole(e.target.value as 'ADMIN' | 'STAFF')}
                                className="bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg px-2 py-1 outline-none focus:border-primary-500 cursor-pointer"
                              >
                                <option value="STAFF">STAFF</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                              <button
                                onClick={() => updateUserRoleMutation.mutate({ id: u.id, role: editingUserRole })}
                                disabled={updateUserRoleMutation.isPending}
                                className="p-1 rounded bg-success-500/20 text-success-400 hover:bg-success-500/30 border border-success-500/30 transition-colors flex items-center justify-center"
                                title="Save"
                              >
                                {updateUserRoleMutation.isPending && editingUserId === u.id ? (
                                  <Spinner className="w-3.5 h-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                disabled={updateUserRoleMutation.isPending}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-705 border border-slate-700 transition-colors flex items-center justify-center"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/role">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                <Shield className="h-3.5 w-3.5 text-primary-500" /> {u.role}
                              </span>
                              {!isCurrentUser && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/role:opacity-100 transition-all focus-within:opacity-100">
                                  <button
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setEditingUserRole(u.role);
                                    }}
                                    className="p-1 rounded bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-850 flex items-center justify-center"
                                    title="Edit Role"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setChangePasswordUser(u);
                                      setNewPassword('');
                                      setConfirmPassword('');
                                    }}
                                    className="p-1 rounded bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-850 flex items-center justify-center"
                                    title="Change Password"
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* 5. SMS Logs viewer */}
          {activeTab === 'sms-logs' && (
            <Card className="flex flex-col space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">SMS Dispatch History</h3>
                  <p className="text-[10px] text-slate-500">Real-time delivery status for all outgoing messages (including test pings).</p>
                </div>
                <Button
                  variant="ghost"
                  className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200 flex items-center justify-center rounded-lg"
                  onClick={() => refetchLogs()}
                  isLoading={isLoadingLogs}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Filters & Search */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-1 flex items-center">
                  <span className="absolute left-3 text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input w-full pl-9 pr-3 py-2 text-sm text-slate-100 rounded-lg outline-none border-slate-800 focus:border-primary-500 bg-slate-950/40"
                  />
                </div>
                
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'queued', label: 'Sent / Queued' },
                    { value: 'failed', label: 'Failed' },
                  ]}
                />

                <Select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Providers' },
                    { value: 'twilio', label: 'Twilio' },
                    { value: 'africasTalking', label: "Africa's Talking" },
                    { value: 'smsLocalhost', label: 'SMS Localhost' },
                  ]}
                />
              </div>

              {/* Logs Content */}
              {isLoadingLogs ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Spinner className="w-8 h-8" />
                  <span className="text-xs text-slate-500">Reading dispatch files...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-slate-850 rounded-lg p-6 bg-slate-900/10">
                  <History className="h-8 w-8 text-slate-650 mb-2" />
                  <p className="text-slate-400 text-xs font-semibold">No matching logs found</p>
                  <p className="text-[10px] text-slate-500 mt-1">Try tweaking your search term or filter parameters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="divide-y divide-slate-850 max-h-[500px] overflow-y-auto pr-1 animate-fade-in">
                    {filteredLogs.map((log: any, index: number) => (
                      <div key={index} className="py-3.5 flex flex-col space-y-1.5 transition-colors hover:bg-slate-900/10 rounded px-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200">{log.to}</span>
                            <span className="text-[9px] text-slate-500 font-medium">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge color={log.status === 'queued' ? 'success' : 'danger'}>
                              {log.status === 'queued' ? 'Sent' : 'Failed'}
                            </Badge>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded uppercase tracking-wider">
                              {log.provider}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-[11px] text-slate-350 bg-slate-950/30 border border-slate-900/50 rounded-lg p-2 font-mono break-all">
                          {log.message}
                        </div>

                        {log.error && (
                          <div className="text-[10px] text-danger-400 font-medium bg-danger-950/15 border border-danger-900/30 rounded p-1.5 flex items-start gap-1">
                            <Info className="h-3.5 w-3.5 text-danger-500 shrink-0 mt-0.5" />
                            <span>{log.error}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[9px] text-slate-505 pt-0.5">
                          <span className="flex items-center gap-1">
                            <span>Msg ID:</span>
                            <span className="font-mono text-slate-400 select-all">{log.msgId}</span>
                            {log.msgId !== 'N/A' && (
                              <button
                                onClick={() => handleCopyId(log.msgId)}
                                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 focus:outline-none"
                                title="Copy Message ID"
                              >
                                {copiedId === log.msgId ? (
                                  <Check className="h-3 w-3 text-success-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Integration Validation Testing Panel / Add New User */}
        <div className="lg:col-span-1">
          {activeTab === 'users' && isAdmin ? (
            <Card className="space-y-4 border-slate-800 bg-slate-900/10">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add New User</h4>
                <p className="text-[10px] text-slate-500 mt-1">Register a new system user with specific role permissions.</p>
              </div>
              <form onSubmit={handleAddUserSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  name="name"
                  placeholder="e.g. John Doe"
                  required
                />
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="e.g. john@example.com"
                  required
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
                <Select
                  label="Access Role"
                  name="role"
                  defaultValue="STAFF"
                  options={[
                    { value: 'STAFF', label: 'Staff (Standard permissions)' },
                    { value: 'ADMIN', label: 'Admin (Full system access)' },
                  ]}
                  required
                />
                <div className="pt-2">
                  <Button
                    variant="primary"
                    type="submit"
                    className="w-full text-xs"
                    isLoading={createUserMutation.isPending}
                  >
                    <UsersIcon className="h-4 w-4 mr-1.5" /> Add User
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="space-y-4 border-slate-800 bg-slate-900/10">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gateway Test Tool</h4>
                <p className="text-[10px] text-slate-500 mt-1">Verify SMS & WhatsApp settings by delivering a quick ping.</p>
              </div>
              
              <Input
                label="Recipient Phone (E.164)"
                placeholder="+26377..."
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              
              <Input
                label="Test Body message"
                value={testMsg}
                onChange={(e) => setTestMsg(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs h-9 py-1 px-2.5 bg-slate-900 hover:bg-primary-500 hover:text-white"
                  onClick={() => testSmsMutation.mutate()}
                  isLoading={testSmsMutation.isPending}
                  disabled={!testPhone}
                >
                  <Send className="h-3 w-3 mr-1" /> Test SMS
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs h-9 py-1 px-2.5 bg-slate-900 hover:bg-success-500 hover:text-white"
                  onClick={() => testWhatsappMutation.mutate()}
                  isLoading={testWhatsappMutation.isPending}
                  disabled={!testPhone}
                >
                  <MessageSquare className="h-3 w-3 mr-1" /> Test WA
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
      {/* Change Password Modal */}
      <Modal
        isOpen={changePasswordUser !== null}
        onClose={() => setChangePasswordUser(null)}
        title={`Change Password for ${changePasswordUser?.name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newPassword !== confirmPassword) {
              toast.error('Passwords do not match.');
              return;
            }
            if (newPassword.length < 6) {
              toast.error('Password must be at least 6 characters long.');
              return;
            }
            updateUserPasswordMutation.mutate({ id: changePasswordUser.id, password: newPassword });
          }}
          className="space-y-4"
        >
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" type="button" onClick={() => setChangePasswordUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={updateUserPasswordMutation.isPending}>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
