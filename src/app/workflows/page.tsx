
'use client'

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, PlusCircle, ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Document, Workflow, Department } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppContext } from '@/context/app-context';
import { EditWorkflowDialog } from '@/components/workflows/edit-workflow-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';


export default function WorkflowsPage() {
  const { addWorkflow, updateWorkflow, currentUser } = useAppContext();
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const { toast } = useToast();

  const documentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'documents');
  }, [firestore]);
  const { data: documentsData } = useCollection<Document>(documentsQuery);
  const documents = useMemo(() => documentsData || [], [documentsData]);
  
  const workflowsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'workflows');
  }, [firestore]);
  const { data: workflowsData } = useCollection<Workflow>(workflowsQuery);
  const workflows = useMemo(() => workflowsData || [], [workflowsData]);

  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'departments');
  }, [firestore]);
  const { data: departmentsData } = useCollection<Department>(departmentsQuery);
  const departments = useMemo(() => departmentsData || [], [departmentsData]);

  const canManageWorkflows = currentUser?.role !== 'Administrator';
  
  const documentsWithoutWorkflow = useMemo(() => {
    return documents.filter(doc => !doc.workflowId);
  }, [documents]);

  const getDepartmentName = (id: string) => departments.find(d => d.id === id)?.name || 'Unknown';

  const isWorkflowLocked = (workflowId: string): boolean => {
    return documents.some(doc => 
        doc.workflowId === workflowId &&
        (doc.currentStep > 0 || (doc.history.length > 0 && doc.history[0].status !== 'Pending'))
    );
  };


  const handleCreateWorkflow = async () => {
    const selectedDoc = documents.find(doc => doc.id === selectedDocumentId);
    if (!selectedDoc || !newWorkflowDesc || selectedDepts.length === 0) {
      toast({
        title: "Error",
        description: "Please select a document, provide a description, and select at least one department.",
        variant: "destructive",
      });
      return;
    }
    const newWorkflowData: Omit<Workflow, 'id'> = {
      name: selectedDoc.name, // Use document name for workflow name
      description: newWorkflowDesc,
      departmentIds: selectedDepts,
    };
    
    const newWorkflowRef = await addWorkflow(newWorkflowData);

    if (newWorkflowRef && firestore) {
        // Link the new workflow to the document
        const docRef = doc(firestore, 'documents', selectedDoc.id);
        const firstDeptId = selectedDepts[0];

        const initialHistory = {
            departmentId: firstDeptId,
            status: 'Pending',
            timestamp: new Date().toISOString(),
            notes: 'Workflow initiated.',
            fileUrl: selectedDoc.fileUrl,
        };

        updateDocumentNonBlocking(docRef, { 
            workflowId: newWorkflowRef.id,
            currentStep: 0,
            status: 'In-Progress',
            pendingDepartmentId: firstDeptId,
            history: [initialHistory]
        });

        toast({
            title: "Success",
            description: `Workflow "${selectedDoc.name}" has been created and assigned.`,
        });
    }


    setIsCreateDialogOpen(false);
    setSelectedDocumentId('');
    setNewWorkflowDesc('');
    setSelectedDepts([]);
  };

  const handleDeptSelection = (deptId: string) => {
    setSelectedDepts(prev => 
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };
  
  const handleEditClick = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setIsEditDialogOpen(true);
  };

  const handleUpdateWorkflow = (workflowId: string, updates: Partial<Omit<Workflow, 'id'>>) => {
    updateWorkflow(workflowId, updates);
    toast({
        title: "Success",
        description: `Workflow "${updates.name}" has been updated.`,
    });
    setIsEditDialogOpen(false);
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Workflow Templates</h1>
                <p className="text-muted-foreground">
                    {canManageWorkflows
                        ? "Create and manage workflow templates for document routing."
                        : "You are viewing workflow templates. Management is restricted to non-administrative users."
                    }
                </p>
            </div>
            {canManageWorkflows && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Workflow
              </Button>
            )}
        </div>


       {canManageWorkflows && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow Template</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="wf-doc">Document to build workflow for</Label>
                      <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a document" />
                        </SelectTrigger>
                        <SelectContent>
                            {documentsWithoutWorkflow.length > 0 ? (
                                documentsWithoutWorkflow.map(doc => (
                                    <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled>No documents need a workflow</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wf-desc">Description</Label>
                    <Textarea id="wf-desc" value={newWorkflowDesc} onChange={e => setNewWorkflowDesc(e.target.value)} placeholder="A brief description of the workflow's purpose." />
                  </div>
                  <div className="space-y-2">
                    <Label>Departments (in order)</Label>
                    <Card>
                      <CardContent className="p-4 space-y-2 max-h-60 overflow-y-auto">
                        {departments.map(dept => (
                          <div key={dept.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`dept-${dept.id}`} 
                              onCheckedChange={() => handleDeptSelection(dept.id)}
                              checked={selectedDepts.includes(dept.id)}
                            />
                            <label
                              htmlFor={`dept-${dept.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                  <Button onClick={handleCreateWorkflow}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => {
            const locked = isWorkflowLocked(workflow.id);
            return (
                <Card key={workflow.id} className="flex flex-col">
                <CardHeader>
                    <CardTitle>{workflow.name}</CardTitle>
                    <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm font-medium mb-2">Workflow Path:</p>
                    <div className="flex flex-wrap items-center gap-2">
                    {workflow.departmentIds.map((id, index) => (
                        <React.Fragment key={id}>
                        <Badge variant="outline">{getDepartmentName(id)}</Badge>
                        {index < workflow.departmentIds.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                        </React.Fragment>
                    ))}
                    </div>
                </CardContent>
                {canManageWorkflows && (
                    <CardFooter>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className='w-full'>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleEditClick(workflow)}
                                        disabled={locked}
                                        className="w-full"
                                    >
                                        Edit Workflow
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {locked && (
                            <TooltipContent>
                                <p>This workflow is in use and cannot be edited.</p>
                            </TooltipContent>
                            )}
                        </Tooltip>
                    </CardFooter>
                )}
                </Card>
            )
            })}
            {!canManageWorkflows && workflows.length === 0 && (
                <Card className="sm:col-span-2 lg:col-span-3">
                    <CardContent className="p-10 text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">No Workflow Templates</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            There are no workflow templates yet. Users with the appropriate permissions can create them.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>

      {selectedWorkflow && canManageWorkflows && (
        <EditWorkflowDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          workflow={selectedWorkflow}
          onUpdateWorkflow={handleUpdateWorkflow}
        />
      )}
      </div>
    </TooltipProvider>
  );
}

    
