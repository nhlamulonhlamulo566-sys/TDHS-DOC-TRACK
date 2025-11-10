
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/context/app-context';
import { useMemo } from 'react';

export function UserNav() {
  const { currentUser, departments } = useAppContext();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login'); 
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const departmentName = useMemo(() => {
    if (!currentUser?.departmentId || !departments) {
      return currentUser?.role === 'Administrator' ? 'System-wide' : 'No Department';
    }
    const department = departments.find(d => d.id === currentUser.departmentId);
    return department?.name || 'Unknown Department';
  }, [currentUser, departments]);

  if (!currentUser) {
    return null; // Or a loading skeleton
  }

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{getInitials(currentUser?.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser?.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser?.email}
            </p>
             <p className="text-xs leading-none text-muted-foreground pt-1">
              <span className="font-semibold">{departmentName}</span>
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/settings" passHref>
            <DropdownMenuItem>
              Settings
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
