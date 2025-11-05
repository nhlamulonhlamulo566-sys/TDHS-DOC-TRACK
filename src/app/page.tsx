
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
          description = 'The email or password you entered is incorrect. Please check your credentials and try again.';
          setPassword(''); // Clear password on invalid credentials
          break;
        case 'auth/invalid-email':
          title = 'Invalid Email';
          description = 'The email address you entered is not valid. Please check the format and try again.';
          break;
        case 'auth/too-many-requests':
           title = 'Too Many Attempts';
           description = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
           break;
        default:
          break;
      }
      
      toast({
        title: title,
        description: description,
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
    <main className="flex min-h-screen w-full flex-row items-center justify-center bg-gray-50 p-4">
      <div className="w-1/2 flex flex-col items-center justify-center pr-10">
          <div className="flex items-center justify-center gap-6">
            <svg
              className="w-32 h-auto text-gray-700"
              viewBox="0 0 798.76 805.82"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              role="img"
              aria-labelledby="sa-dept-health-logo-title"
            >
              <title id="sa-dept-health-logo-title">Logo of the Department of Health, Republic of South Africa</title>
              <path d="m399.38 0c-133.12 0-241.01 107.89-241.01 241.01s107.89 241.01 241.01 241.01 241.01-107.89 241.01-241.01-107.89-241.01-241.01-241.01zm0 433.82c-106.39 0-192.8-86.41-192.8-192.8s86.41-192.8 192.8-192.8 192.8 86.41 192.8 192.8-86.41 192.8-192.8 192.8z"/>
              <path d="m399.38 564.8c-121.28 0-219.5 98.22-219.5 219.5v21.52h439v-21.52c0-121.28-98.22-219.5-219.5-219.5zm0 392.82c-96.68 0-175.5-78.82-175.5-175.5s78.82-175.5 175.5-175.5 175.5 78.82 175.5 175.5-78.82 175.5-175.5 175.5z"/>
              <path d="m66.69 486.01c-36.85 0-66.69 29.84-66.69 66.69v186.43h133.38v-253.12h-66.69z"/>
              <path d="m732.07 486.01h-66.69v253.12h133.38v-186.43c0-36.85-29.84-66.69-66.69-66.69z"/>
            </svg>
            <div className="flex flex-col">
              <span className="text-[4rem] font-light leading-none" style={{color: '#006b3f'}}>health</span>
              <div className="border-t-4 border-black mt-1 mb-2"></div>
              <span className="text-md font-bold" style={{color: '#006b3f'}}>Department:</span>
              <span className="text-md font-bold" style={{color: '#006b3f'}}>Health</span>
              <span className="text-md font-bold" style={{color: '#006b3f'}}>REPUBLIC OF SOUTH AFRICA</span>
            </div>
        </div>
      </div>
      <div className="w-1/2 flex flex-col items-center justify-center pl-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">Tshwane District Health Services</CardTitle>
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
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="text-center mt-6 text-xs text-gray-500 max-w-md">
            <p>Authorized access only • Tshwane District Health Services</p>
            <p className="font-bold mt-1">
              If you don't have an account, please ask your administrator to create one for you.
            </p>
          </div>
      </div>
    </main>
  );
}
