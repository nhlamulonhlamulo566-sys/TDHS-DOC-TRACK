

'use client';

import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User, Department } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { PlusCircle, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

type NewUser = Omit<User, 'id'> & { password?: string, confirmPassword?: string };

export default function SettingsPage() {
  const { addUser, currentUser } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({ name: '', email: '', persalNumber: '', role: 'Assistant Director', departmentId: '', password: '', confirmPassword: '' });

  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'departments');
  }, [firestore]);
  const { data: departmentsData } = useCollection<Department>(departmentsQuery);
  const departments = useMemo(() => departmentsData || [], [departmentsData]);
  
  const canAddUsers = currentUser?.role === 'Administrator';

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.persalNumber || !newUser.role || !newUser.password) {
        toast({
            title: "Error",
            description: "Please fill in all required fields.",
            variant: "destructive",
        });
        return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      toast({
          title: "Error",
          description: "Passwords do not match.",
          variant: "destructive",
      });
      return;
    }
    if (!/^\d{8}$/.test(newUser.persalNumber)) {
        toast({
            title: "Invalid Persal Number",
            description: "Persal number must be exactly 8 digits.",
            variant: "destructive",
        });
        return;
    }
    
    try {
      await addUser({
          name: newUser.name,
          email: newUser.email,
          persalNumber: newUser.persalNumber,
          role: newUser.role,
          departmentId: newUser.departmentId,
      }, newUser.password);

      toast({
          title: "User Added",
          description: `${newUser.name} has been added to the system.`
      });
      
      setNewUser({ name: '', email: '', persalNumber: '', role: 'Assistant Director', departmentId: '', password: '', confirmPassword: '' });
      setIsAddUserOpen(false);
    } catch (error: any) {
        toast({
            title: "Error creating user",
            description: error.message,
            variant: "destructive",
        });
    }
  };


  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
           <CardDescription>
            {canAddUsers
              ? "Add new users to the system. User roles can be managed directly here."
              : "User management is restricted to administrators."}
          </CardDescription>
        </CardHeader>
        <CardContent>
            {canAddUsers ? (
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                        <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Fill in the details for the new user.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-name" className="text-right">Name</Label>
                                <Input 
                                    id="user-name" 
                                    value={newUser.name} 
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})} 
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-email" className="text-right">Email</Label>
                                <Input 
                                    id="user-email" 
                                    type="email"
                                    value={newUser.email} 
                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})} 
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="persal-number" className="text-right">Persal No.</Label>
                                <Input 
                                    id="persal-number" 
                                    value={newUser.persalNumber} 
                                    onChange={(e) => setNewUser({...newUser, persalNumber: e.target.value})} 
                                    className="col-span-3"
                                    maxLength={8}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-password" className="text-right">Password</Label>
                                <Input 
                                    id="user-password"
                                    type="password"
                                    value={newUser.password} 
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})} 
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-confirm-password" className="text-right">Confirm</Label>
                                <Input 
                                    id="user-confirm-password"
                                    type="password"
                                    value={newUser.confirmPassword} 
                                    onChange={(e) => setNewUser({...newUser, confirmPassword: e.target.value})} 
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-dept" className="text-right">Department</Label>
                                <Select value={newUser.departmentId} onValueChange={(val) => setNewUser({...newUser, departmentId: val})}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="user-role" className="text-right">Role</Label>
                                <Select value={newUser.role} onValueChange={(val: User['role']) => setNewUser({...newUser, role: val})}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Administrator">Administrator</SelectItem>
                                        <SelectItem value="Chief Director">Chief Director</SelectItem>
                                        <SelectItem value="Deputy Director">Deputy Director</SelectItem>
                                        <SelectItem value="Assistant Director">Assistant Director</SelectItem>
                                        <SelectItem value="Personal Assistant">Personal Assistant</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleAddUser}>Create User</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ) : (
                <div className="flex items-center p-4 rounded-md bg-muted text-muted-foreground">
                    <ShieldCheck className="h-5 w-5 mr-3" />
                    <p className="text-sm">Only users with the 'Administrator' role can add new users.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
