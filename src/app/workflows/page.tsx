
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
import { ArrowRight, PlusCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Document, DocumentHistory, Workflow, Department } from '@/lib/types';
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
import { collection } from 'firebase/firestore';


export default function WorkflowsPage() {
  const { addWorkflow, updateWorkflow, updateDocument, currentUser } = useAppContext();
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDocId, setNewWorkflowDocId] = useState('');
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

  const documentsWithoutWorkflow = useMemo(() => {
    return documents.filter(doc => !doc.workflowId);
  }, [documents]);

  const canManageWorkflows = currentUser?.role !== 'Administrator';

  const getDepartmentName = (id: string) => departments.find(d => d.id === id)?.name || 'Unknown';

  const isWorkflowLocked = (workflowId: string): boolean => {
    return documents.some(doc => 
        doc.workflowId === workflowId &&
        (doc.currentStep > 0 || (doc.history.length > 0 && doc.history[0].status !== 'Pending'))
    );
  };


  const handleCreateWorkflow = async () => {
    if (!newWorkflowName || !newWorkflowDocId || !newWorkflowDesc || selectedDepts.length === 0) {
      toast({
        title: "Error",
        description: "Please fill all fields and select at least one department.",
        variant: "destructive",
      });
      return;
    }
    const newWorkflowData: Omit<Workflow, 'id'> = {
      name: newWorkflowName,
      description: newWorkflowDesc,
      departmentIds: selectedDepts,
    };
    
    // Add the workflow and get its ID
    const newWorkflowRef = await addWorkflow(newWorkflowData);
    if (newWorkflowRef) {
        const newWorkflowId = newWorkflowRef.id;

        // Find the document and update it with the new workflowId
        const docToUpdate = documents.find(d => d.id === newWorkflowDocId);

        if (docToUpdate) {
            const firstDeptId = selectedDepts[0];
            // Create the first history entry for the start of the workflow
            const initialHistoryEntry: DocumentHistory = {
                departmentId: firstDeptId,
                status: 'Pending',
                timestamp: new Date().toISOString(),
                notes: 'Workflow initiated.'
            };

            // Update the document to assign the workflow and set its initial state
            updateDocument(docToUpdate.id, {
                workflowId: newWorkflowId,
                currentStep: 0,
                history: [initialHistoryEntry],
                status: 'In-Progress', // Ensure status is In-Progress
                pendingDepartmentId: firstDeptId, // Set the pending department
            });
            
            toast({
                title: "Success",
                description: `Workflow "${newWorkflowName}" has been created and assigned.`,
            });
        }
    }


    setIsCreateDialogOpen(false);
    setNewWorkflowName('');
    setNewWorkflowDocId('');
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

  const handleDocumentSelect = (docId: string) => {
    const selectedDoc = documents.find(d => d.id === docId);
    if (selectedDoc) {
      setNewWorkflowName(`${selectedDoc.name} Workflow`);
      setNewWorkflowDocId(selectedDoc.id);
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Workflows</h1>
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
                <DialogTitle>Create New Workflow</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="wf-name">Workflow for Document</Label>
                    <Select onValueChange={handleDocumentSelect} value={newWorkflowDocId}>
                      <SelectTrigger id="wf-name">
                        <SelectValue placeholder="Select a document to create a workflow for" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentsWithoutWorkflow.length > 0 ? (
                          documentsWithoutWorkflow.map(doc => (
                            <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="disabled" disabled>No documents need a workflow</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wf-desc">Description</Label>
                    <Textarea id="wf-desc" value={newWorkflowDesc} onChange={e => setNewWorkflowDesc(e.target.value)} placeholder="A brief description of the workflow." />
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      </div>

      {selectedWorkflow && canManageWorkflows && (
        <EditWorkflowDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          workflow={selectedWorkflow}
          onUpdateWorkflow={handleUpdateWorkflow}
        />
      )}
    </TooltipProvider>
  );
}
