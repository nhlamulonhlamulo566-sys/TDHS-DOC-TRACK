
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This effect will force a logout and redirect to the login page.
    if (auth && !isUserLoading) {
        signOut(auth).finally(() => {
            router.replace('/login');
        });
    } else if (!isUserLoading) {
        router.replace('/login');
    }
  }, [isUserLoading, auth, router]);

  // Show a loading indicator while we process the logout and redirect.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
