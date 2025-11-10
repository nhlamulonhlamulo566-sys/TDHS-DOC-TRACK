
'use client'

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ShieldCheck, Ban } from 'lucide-react';
import type { Department } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useAppContext } from '@/context/app-context';

export default function DepartmentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { currentUser } = useAppContext();

  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'departments');
  }, [firestore]);
  
  const { data: departmentsData } = useCollection<Department>(departmentsQuery);
  const departments = useMemo(() => departmentsData || [], [departmentsData]);

  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [editedDepartmentName, setEditedDepartmentName] = useState('');

  const isAdmin = currentUser?.role === 'Administrator';

  const addDepartment = async (department: Omit<Department, 'id'>) => {
    if (!firestore) {
        toast({
            title: "Error",
            description: "Database connection not available.",
            variant: "destructive",
        });
        return;
    }
    const departmentsCol = collection(firestore, 'departments');
    try {
      await addDoc(departmentsCol, department);
      toast({
        title: "Success",
        description: `Department "${department.name}" has been added.`,
      });
    } catch (error: any) {
        toast({
          title: "Database Error",
          description: `Failed to add department: ${error.message}`,
          variant: "destructive",
        });
    }
  };

  const updateDepartment = (departmentId: string, updates: Partial<Omit<Department, 'id'>>) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'departments', departmentId);
    updateDocumentNonBlocking(docRef, updates);
  };

  const deleteDepartment = (departmentId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'departments', departmentId);
    deleteDocumentNonBlocking(docRef);
  };


  const handleAddDepartment = () => {
    if (newDepartmentName.trim() === '') {
      toast({
        title: "Error",
        description: "Department name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    addDepartment({ name: newDepartmentName, icon: 'Building2' });
    setNewDepartmentName('');
    setIsAddDialogOpen(false);
  };

  const handleEditClick = (department: Department) => {
    setSelectedDepartment(department);
    setEditedDepartmentName(department.name);
    setIsEditDialogOpen(true);
  };

  const handleUpdateDepartment = () => {
    if (!selectedDepartment || editedDepartmentName.trim() === '') {
      toast({
        title: "Error",
        description: "Department name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    updateDepartment(selectedDepartment.id, { name: editedDepartmentName });
    setIsEditDialogOpen(false);
    setSelectedDepartment(null);
    toast({
      title: "Success",
      description: `Department "${editedDepartmentName}" has been updated.`,
    });
  };

  const handleDeleteClick = (department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = () => {
    if (!selectedDepartment) return;

    deleteDepartment(selectedDepartment.id);
    setIsDeleteDialogOpen(false);
    setSelectedDepartment(null);
    toast({
      title: "Success",
      description: `Department "${selectedDepartment.name}" has been deleted.`,
    });
  }

  if (!isAdmin) {
    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Ban className="text-destructive" />
                    Access Denied
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p>You do not have the necessary permissions to view this page. Please contact an administrator if you believe this is an error.</p>
            </CardContent>
        </Card>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Departments</h1>
            <p className="text-muted-foreground">View and manage organizational departments.</p>
        </div>
        {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Department
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Add New Department</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                    Name
                    </Label>
                    <Input
                    id="name"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g. Legal"
                    />
                </div>
                </div>
                <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddDepartment}>Add Department</Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Department List</CardTitle>
           <CardDescription>
            {isAdmin
              ? "Manage all departments in the organization."
              : "You are viewing a list of all departments. Management is restricted to administrators."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>ID</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell className="text-muted-foreground">{department.id}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(department)}>
                            Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                            onClick={() => handleDeleteClick(department)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editedDepartmentName}
                onChange={(e) => setEditedDepartmentName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Legal"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateDepartment}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the department
              "{selectedDepartment?.name}" and remove it from any associated workflows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
