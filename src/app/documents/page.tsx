
'use client';

import { useMemo, useState } from 'react';
import { DocumentCard } from '@/components/dashboard/document-card';
import { useAppContext } from '@/context/app-context';
import { Loader2 } from 'lucide-react';
import type { Document } from '@/lib/types';
import { EditDocumentDialog } from '@/components/dashboard/edit-document-dialog';
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
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';


export default function DocumentsPage() {
    const { currentUser, updateDocument, deleteDocument, workflows, departments } = useAppContext();
    const firestore = useFirestore();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const { toast } = useToast();

    const documentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'documents');
    }, [firestore]);
    const { data: documentsData } = useCollection<Document>(documentsQuery);
    const documents = useMemo(() => documentsData || [], [documentsData]);
    

    const canPerformActions = currentUser?.role !== 'Administrator';

    const filteredDocuments = useMemo(() => {
        if (!currentUser || !documents) return [];
    
        if (currentUser.role === 'Administrator') {
            return documents;
        }
    
        return documents.filter(doc => {
            const workflow = workflows.find(w => w.id === doc.workflowId);
            const originatingDepartmentId = doc.history?.[0]?.departmentId;
            const userDepartmentId = currentUser.departmentId;

            // Handle drafts: visible if no workflow is assigned yet
            if (!workflow || !originatingDepartmentId) {
                return true; 
            }

            // Handle completed or rejected documents
            if (doc.status === 'Completed' || doc.status === 'Rejected') {
                // ONLY visible to the originating department
                return userDepartmentId === originatingDepartmentId;
            }

            // Handle in-progress documents
            if (doc.status === 'In-Progress') {
                // Visible if the user's department is the originator OR is in the workflow path
                const isOriginator = userDepartmentId === originatingDepartmentId;
                const isInWorkflow = userDepartmentId && workflow.departmentIds.includes(userDepartmentId);
                return isOriginator || isInWorkflow;
            }

            return false;
        });
    }, [documents, workflows, currentUser]);

    if (!currentUser) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    const handleEditClick = (doc: Document) => {
        setSelectedDocument(doc);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (doc: Document) => {
        setSelectedDocument(doc);
        setIsDeleteDialogOpen(true);
    };
    
    const handleUpdateDocument = (docId: string, updates: Partial<Document>) => {
        updateDocument(docId, updates);
        toast({ title: 'Document Updated' });
        setIsEditDialogOpen(false);
    };

    const handleDeleteConfirm = () => {
        if (selectedDocument) {
            deleteDocument(selectedDocument.id);
            toast({ title: 'Document Deleted' });
            setIsDeleteDialogOpen(false);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">All Documents</h1>
                    <p className="text-muted-foreground">Browse and manage all documents relevant to you.</p>
                </div>
            </div>
            {filteredDocuments.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {filteredDocuments.map((doc) => (
                        <DocumentCard 
                          key={doc.id} 
                          document={doc} 
                          workflows={workflows} 
                          departments={departments}
                          currentUser={currentUser}
                          onEdit={canPerformActions && !doc.workflowId ? handleEditClick : undefined}
                          onDelete={canPerformActions && !doc.workflowId ? handleDeleteClick : undefined}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg mt-6">
                    <h2 className="text-xl font-semibold">No Documents Found</h2>
                    <p className="text-muted-foreground mt-2">There are no documents associated with your department.</p>
                </div>
            )}
            
            {selectedDocument && canPerformActions && (
                <EditDocumentDialog
                    isOpen={isEditDialogOpen}
                    onClose={() => setIsEditDialogOpen(false)}
                    document={selectedDocument}
                    onUpdateDocument={handleUpdateDocument}
                />
            )}

            {canPerformActions && (
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the document
                               "{selectedDocument?.name}".
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
            )}
        </div>
    );
}
