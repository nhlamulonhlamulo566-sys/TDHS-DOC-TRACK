
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineTitle, TimelineIcon, TimelineDescription } from '@/components/ui/timeline';
import { format } from 'date-fns';
import { Check, X, Hourglass, ArrowLeft, ThumbsUp, ThumbsDown, PartyPopper, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Document, DocumentHistory } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

// Client-side only component to prevent hydration mismatch on date formatting
function ClientFormattedDate({ timestamp }: { timestamp: string }) {
    const [formattedDate, setFormattedDate] = useState('');
  
    useEffect(() => {
      setFormattedDate(format(new Date(timestamp), "MMM d, yyyy - h:mm a"));
    }, [timestamp]);
  
    if (!formattedDate) {
      return null; // or a loading skeleton
    }
  
    return <>{formattedDate}</>;
}


export default function DocumentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { updateDocument, addDocumentHistory, currentUser, workflows, departments } = useAppContext();
    const [notes, setNotes] = useState('');
    const { toast } = useToast();

    const docId = Array.isArray(id) ? id[0] : id;

    const docRef = useMemoFirebase(() => {
        if (!firestore || !docId) return null;
        return doc(firestore, 'documents', docId);
    }, [firestore, docId]);

    const { data: document, isLoading: isDocumentLoading } = useDoc<Document>(docRef);

    const workflow = document ? workflows.find(w => w.id === document.workflowId) : undefined;

    if (isDocumentLoading || !currentUser) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!document) {
        return <div>Document not found.</div>;
    }
    
    if (!workflow && document.workflowId) {
        return <div>Loading workflow...</div>
    }
    
    if (!workflow) {
      // This case handles when the document is found but there's no workflow assigned yet.
      // You might want to show a specific UI for this. For now, we'll show a simple message.
       return (
         <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">{document.name}</h1>
                 <Badge variant="destructive">No Workflow Assigned</Badge>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Document Content</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{document.content}</p>
                </CardContent>
            </Card>
        </div>
       )
    }

    const handleUpdateStatus = (newStatus: 'Approved' | 'Rejected') => {
        // 1. Update the history for the *current* step
        const currentStepHistoryUpdate: Partial<DocumentHistory> = {
            status: newStatus,
            timestamp: new Date().toISOString(),
            notes: notes,
        };
        addDocumentHistory(document.id, currentStepHistoryUpdate, false, document.currentStep, document.history); // `false` to update existing step
    
        if (newStatus === 'Approved') {
            const nextStepIndex = document.currentStep + 1;
            const isWorkflowEnd = nextStepIndex >= workflow.departmentIds.length;
    
            if (isWorkflowEnd) {
                // 2a. Final step approved: Mark workflow as 'Completed'
                updateDocument(document.id, { status: 'Completed', pendingDepartmentId: '' }); // Clear pending department
                // Add a final 'Completed' entry to the history log
                const completionHistory: Partial<DocumentHistory> = {
                    departmentId: 'system', // Or the last department ID
                    status: 'Completed',
                    timestamp: new Date().toISOString(),
                    notes: 'Workflow finished'
                };
                addDocumentHistory(document.id, completionHistory, true, document.currentStep + 1, document.history); // `true` to add as new entry
            } else {
                // 2b. Not the final step: Move to the next step
                const nextDeptId = workflow.departmentIds[nextStepIndex];
                updateDocument(document.id, { currentStep: nextStepIndex, pendingDepartmentId: nextDeptId });
                // Create a new 'Pending' history entry for the next department
                const nextStepHistory: DocumentHistory = {
                    departmentId: nextDeptId,
                    status: 'Pending',
                    timestamp: new Date().toISOString(),
                };
                addDocumentHistory(document.id, nextStepHistory, true, document.currentStep + 1, document.history); // `true` to add as new entry
            }
        } else { // 'Rejected'
            // 2c. If rejected, mark the entire document workflow as 'Rejected'
            updateDocument(document.id, { status: 'Rejected', pendingDepartmentId: '' }); // Clear pending department
        }
        
        toast({
            title: `Document ${newStatus}`,
            description: `The document has been ${newStatus.toLowerCase()}.`,
        });
        setNotes('');
        router.push('/dashboard');
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Approved': return <Check className="h-4 w-4" />;
            case 'Rejected': return <X className="h-4 w-4" />;
            case 'Pending': return <Hourglass className="h-4 w-4" />;
            case 'Completed': return <PartyPopper className="h-4 w-4" />;
            default: return <div className="h-2 w-2 rounded-full bg-gray-400" />;
        }
    };
    
    const getStatusColor = (status: DocumentHistory['status'] | 'Upcoming' | 'Completed') => {
        switch (status) {
          case 'Approved':
          case 'Completed': 
            return 'bg-green-500 text-white';
          case 'Pending': return 'bg-yellow-500 text-white';
          case 'Rejected': return 'bg-red-500 text-white';
          default: return 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-300';
        }
    };

    const currentStepInfo = document.history[document.currentStep];
    // Admins cannot take action, only assigned departments can.
    const canTakeAction = 
        currentUser.role !== 'Administrator' &&
        currentStepInfo?.status === 'Pending' && 
        document.status !== 'Completed' && 
        document.status !== 'Rejected' &&
        workflow.departmentIds[document.currentStep] === currentUser.departmentId;

    const isCompleted = document.status === 'Completed';

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">{document.name}</h1>
                <Badge variant="outline">{document.type}</Badge>
                 {isCompleted && <Badge className="border-transparent bg-green-100 text-green-800">Workflow Completed</Badge>}
                 {document.status === 'Rejected' && <Badge variant="destructive">Workflow Rejected</Badge>}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Document Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{document.content}</p>
                        </CardContent>
                    </Card>

                   {canTakeAction && (
                     <Card>
                        <CardHeader>
                            <CardTitle>Take Action</CardTitle>
                            <CardDescription>Approve or reject the document for the current step.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea 
                                placeholder="Add optional notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <div className="flex gap-4">
                                <Button onClick={() => handleUpdateStatus('Approved')} className="bg-green-600 hover:bg-green-700">
                                    <ThumbsUp className="mr-2 h-4 w-4"/> Approve
                                </Button>
                                <Button variant="destructive" onClick={() => handleUpdateStatus('Rejected')}>
                                     <ThumbsDown className="mr-2 h-4 w-4"/> Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                   )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Workflow History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Timeline>
                                {workflow.departmentIds.map((deptId, index) => {
                                    const dept = departments.find(d => d.id === deptId);
                                    const historyItem = document.history[index];
                                    
                                    let status: DocumentHistory['status'] | 'Upcoming' | 'Completed' = 'Upcoming';
                                    if(index < document.currentStep){
                                        status = 'Approved';
                                    } else if (historyItem) {
                                        status = historyItem.status;
                                    }
                                    
                                    if(isCompleted) {
                                      status = 'Completed';
                                    }
                                    

                                    return (
                                        <TimelineItem key={deptId}>
                                            <TimelineHeader>
                                                <TimelineIcon className={cn(getStatusColor(status))}>
                                                    {getStatusIcon(status)}
                                                </TimelineIcon>
                                                <TimelineTitle>{dept?.name}</TimelineTitle>
                                            </TimelineHeader>
                                            {index < workflow.departmentIds.length -1 && <TimelineConnector />}
                                            {historyItem?.timestamp && (
                                               <TimelineDescription>
                                                    <ClientFormattedDate timestamp={historyItem.timestamp} />
                                                    {historyItem.notes && <div className="text-xs italic text-muted-foreground mt-1">"{historyItem.notes}"</div>}
                                               </TimelineDescription>
                                            )}
                                        </TimelineItem>
                                    )
                                })}
                                 {isCompleted && document.history.some(h => h.status === "Completed") && (
                                    <TimelineItem>
                                        <TimelineHeader>
                                            <TimelineIcon className={cn(getStatusColor('Completed'))}>
                                                {getStatusIcon('Completed')}
                                            </TimelineIcon>
                                            <TimelineTitle>Workflow Complete</TimelineTitle>
                                        </TimelineHeader>
                                    </TimelineItem>
                                )}
                            </Timeline>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
