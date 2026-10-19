'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/providers/AuthProvider';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name too short'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'], message: 'Passwords do not match',
  });

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [closed, setClosed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authApi.status()
      .then((res) => setClosed(!!res.data?.hasAnyUser))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { confirmPassword, ...payload } = values;
      if (!payload.phone) delete payload.phone;
      await register(payload);
      router.replace('/dashboard');
    } catch (err) {
      setServerError(err.message || 'Registration failed');
    }
  };

  if (checking) return <div className="text-center text-sm text-muted-foreground">Checking setup status…</div>;

  if (closed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration closed</CardTitle>
          <CardDescription>An owner account already exists. Please sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login"><Button className="w-full">Go to login</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create owner account</CardTitle>
        <CardDescription>First-time setup — creates the main owner account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </div>
          )}
          {['name', 'email', 'phone', 'password', 'confirmPassword'].map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field} className="capitalize">
                {field === 'confirmPassword' ? 'Confirm Password' : field}
                {field === 'phone' && ' (optional)'}
              </Label>
              <Input
                id={field}
                type={field.toLowerCase().includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
                autoComplete={field === 'email' ? 'email' : field.toLowerCase().includes('password') ? 'new-password' : 'off'}
                {...form.register(field)}
              />
              {form.formState.errors[field] && (
                <p className="text-xs text-destructive">{form.formState.errors[field].message}</p>
              )}
            </div>
          ))}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Creating…' : 'Create owner account'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account? <Link className="text-primary hover:underline" href="/login">Sign in</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}