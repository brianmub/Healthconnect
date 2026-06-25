import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Button, Input, Card } from '../components/ui';
import { Activity, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = zod.object({
  email: zod.string().email('Please enter a valid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormInputs = zod.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', data);
      const { accessToken, refreshToken, user } = response.data;
      
      login(accessToken, refreshToken, user as any);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Invalid credentials or connection error.';
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-primary-500 to-sky-400 flex items-center justify-center shadow-lg shadow-primary-500/20 mb-3 animate-pulse">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Welcome to HealthConnect
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to manage dental practice messaging
          </p>
        </div>

        {/* Card Panel */}
        <Card className="glass-panel border-slate-800">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-3 top-9 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@healthconnect.com"
                className="pl-9"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-9 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2 font-semibold"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>
        </Card>

      </div>
    </div>
  );
}
