'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SAHealthLogo } from '@/components/sa-health-logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [isUserLoading, user, router]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({
        title: 'Error',
        description: 'Authentication service is not available.',
        variant: 'destructive',
      });
      return;
    }
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both email and password.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      router.push('/dashboard');
    } catch (error: any) {
      let title = 'Login Failed';
      let description = 'An unexpected error occurred. Please try again.';

      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          title = 'Invalid Credentials';
          description =
            'The email or password you entered is incorrect. Please check your credentials and try again.';
          setPassword('');
          break;
        case 'auth/invalid-email':
          title = 'Invalid Email';
          description = 'The email address you entered is not valid. Please check the format.';
          break;
        case 'auth/too-many-requests':
          title = 'Too Many Attempts';
          description =
            'Access to this account has been temporarily disabled. Please reset your password or try again later.';
          break;
        default:
          break;
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 overflow-hidden">
      {/* Logo Background Centered Behind the Card */}
      <div className="absolute flex items-center justify-center inset-0 pointer-events-none">
        <div className="relative w-[500px] h-[500px] opacity-15">
          <SAHealthLogo className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Optional subtle overlay for readability */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" />

      {/* Login Card */}
      <Card className="relative w-full max-w-sm z-10 bg-white/90 backdrop-blur-md shadow-xl border border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline text-primary">
            Tshwane District Health Services
          </CardTitle>
          <CardDescription>Document Tracking System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-xs text-gray-600 max-w-md mt-8">
            <p>Authorized access only • Tshwane District Health Services</p>
            <p className="font-bold mt-1">
              If you don't have an account, please ask your administrator to create one for you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
