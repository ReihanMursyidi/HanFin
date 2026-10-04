'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginUser, registerUser } from '@/features/auth/action';
import { authSchema, type AuthInput } from '@/features/auth/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { CoinsIcon, Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const form = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: AuthInput) => {
      if (isRegister) {
        return await registerUser(data);
      } else {
        return await loginUser(data);
      }
    },
    onSuccess: (message) => {
      toast.success(message);
      if (!isRegister) {
        queryClient.removeQueries();
        router.push('/home/dashboard');
      } else {
        setIsRegister(false);
        form.reset();
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'An unexpected error has occurred');
    },
  });

  function onSubmit(data: AuthInput) {
    mutate(data);
  }

  if (!showForm) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-4">
        <div className='flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500'>
          <CoinsIcon className='text-primary size-20' />
          <h1 className="mt-4 text-4xl font-bold text-primary">Welcome to HanFin</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Your personal finance app with AI
          </p>
          <Button
            className="mt-6"
            size="lg"
            onClick={() => setShowForm(true)} 
          >
            Get Started
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-4">
      <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <CoinsIcon className="text-primary size-12" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isRegister ? 'Create an Account' : 'Login to HanFin'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isRegister && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  disabled={isPending}
                  {...form.register('username')}
                />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email" 
                placeholder="m@example.com"
                disabled={isPending}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                disabled={isPending}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button className="w-full mt-4" type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              <span aria-live="polite" aria-atomic="true">
                {isPending
                  ? isRegister ? 'Creating account...' : 'Signing in...'
                  : isRegister ? 'Sign Up' : 'Login'}
              </span>
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => {
                setIsRegister(!isRegister);
                form.reset();
              }}
              disabled={isPending}
            >
              {isRegister ? 'Login here' : 'Sign up here'}
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground"
            onClick={() => setShowForm(false)}
            disabled={isPending}
          >
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}