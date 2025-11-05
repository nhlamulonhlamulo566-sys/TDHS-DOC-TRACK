
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Workflow, Department } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

interface EditWorkflowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow;
  onUpdateWorkflow: (workflowId: string, updates: Partial<Omit<Workflow, 'id'>>) => void;
}

export function EditWorkflowDialog({ isOpen, onClose, workflow, onUpdateWorkflow }: EditWorkflowDialogProps) {
  const firestore = useFirestore();
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(workflow.departmentIds);
  const { toast } = useToast();

  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'departments');
  }, [firestore]);
  const { data: departmentsData } = useCollection<Department>(departmentsQuery);
  const departments = useMemo(() => departmentsData || [], [departmentsData]);


  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description);
      setSelectedDepts(workflow.departmentIds);
    }
  }, [workflow]);

  const handleDeptSelection = (deptId: string) => {
    setSelectedDepts(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSaveChanges = () => {
    if (!name || !description || selectedDepts.length === 0) {
      toast({
        title: "Error",
        description: "Please fill all fields and select at least one department.",
        variant: "destructive",
      });
      return;
    }
    onUpdateWorkflow(workflow.id, { name, description, departmentIds: selectedDepts });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Workflow</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="wf-name">Workflow Name</Label>
            <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-desc">Description</Label>
            <Textarea id="wf-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Departments (in order)</Label>
            <Card>
              <CardContent className="p-4 space-y-2 max-h-60 overflow-y-auto">
                {departments.map(dept => (
                  <div key={dept.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-dept-${dept.id}`}
                      onCheckedChange={() => handleDeptSelection(dept.id)}
                      checked={selectedDepts.includes(dept.id)}
                    />
                    <label
                      htmlFor={`edit-dept-${dept.id}`}
                      className="text-sm font-medium"
                    >
                      {dept.name}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
