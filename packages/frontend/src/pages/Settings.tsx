import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, Badge, Button, Input, Select, Spinner } from '../components/ui';
import { useForm } from 'react-hook-form';
import {
  Building,
  Smartphone,
  MessageSquare,
  Users as UsersIcon,
  Shield,
  Send,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'sms' | 'whatsapp' | 'users'>('profile');
  const [testPhone, setTestPhone] = useState('');
  const [testMsg, setTestMsg] = useState('This is a test notification from HealthConnect.');

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/api/settings');
      return data;
    },
  });

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
      twilioAccountSid: data.get('twilioAccountSid'),
      twilioAuthToken: data.get('twilioAuthToken'),
      twilioPhoneNumber: data.get('twilioPhoneNumber'),
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

  // Mock users list matching seeded data
  const mockUsers = [
    { name: 'Dr. Brian Mubvumbi', email: 'admin@healthconnect.com', role: 'ADMIN' },
    { name: 'Sarah Ncube', email: 'staff@healthconnect.com', role: 'STAFF' },
  ];

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
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'whatsapp'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="h-4 w-4" /> WhatsApp Gateway
        </button>
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

              {/* Twilio fallback card */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-700/50 text-slate-400">
                    <Smartphone className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Twilio SMS</h3>
                    <p className="text-[10px] text-slate-500">Set <code className="bg-slate-800 px-1 rounded">SMS_PROVIDER=twilio</code> to use this provider</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <Input label="Twilio Account SID" name="twilioAccountSid" defaultValue={settings?.twilioAccountSid} />
                  <Input label="Twilio Auth Token" name="twilioAuthToken" type="password" placeholder="••••••••••••••••" />
                  <Input label="Twilio Outbound Phone Number" name="twilioPhoneNumber" defaultValue={settings?.twilioPhoneNumber} />
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
                    <Input label="Meta WhatsApp API Token" name="metaWhatsappToken" type="password" placeholder="••••••••" />
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
          {activeTab === 'users' && (
            <Card className="p-0 overflow-hidden">
              <div className="p-6 border-b border-slate-850 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">User Administration</h3>
                <Badge color="primary">Active Team</Badge>
              </div>
              <div className="divide-y divide-slate-800">
                {mockUsers.map((u) => (
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
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      <Shield className="h-3.5 w-3.5 text-primary-500" /> {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Integration Validation Testing Panel */}
        <div className="lg:col-span-1">
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
        </div>
      </div>
    </div>
  );
}
