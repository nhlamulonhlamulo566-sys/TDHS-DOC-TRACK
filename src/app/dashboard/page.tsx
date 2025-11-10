
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { FilePlus2, Loader2 } from 'lucide-react';
import { DocumentCard } from '@/components/dashboard/document-card';
import { AddDocumentDialog } from '@/components/dashboard/add-document-dialog';
import { useAppContext } from '@/context/app-context';
import type { Document } from '@/lib/types';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function DashboardPage() {
  const { addDocument, currentUser, workflows, departments } = useAppContext();
  const firestore = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const documentsQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;

    const docsCollection = collection(firestore, 'documents');

    if (currentUser.role === 'Administrator') {
      // Admins see all in-progress documents
      return query(docsCollection, where('status', '==', 'In-Progress'));
    } else {
      // Non-admins see documents pending in their department. This is very efficient.
      return query(
        docsCollection,
        where('status', '==', 'In-Progress'),
        where('pendingDepartmentId', '==', currentUser.departmentId || '')
      );
    }
  }, [firestore, currentUser]);
  
  const { data: dashboardDocuments, isLoading: isDocumentsLoading } = useCollection<Document>(documentsQuery);

  const handleAddDocument = (
    newDocument: Omit<Document, 'id' | 'history' | 'currentStep' | 'status' | 'pendingDepartmentId' | 'workflowId'>
  ) => {
    addDocument(newDocument);
  };
  
  if (!currentUser || isDocumentsLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const canAddDocument = currentUser.role !== 'Administrator';
  const welcomeMessage = currentUser ? `Welcome back, ${currentUser.name.split(' ')[0]}!` : 'Welcome!';

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Documents Overview</h1>
            <p className="text-muted-foreground">{welcomeMessage}</p>
        </div>
        <div className="flex items-center space-x-2">
           <Button asChild size="sm">
            <Link href="/documents">View All Documents</Link>
          </Button>
          {canAddDocument && (
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <FilePlus2 className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          )}
        </div>
      </div>
      
      {canAddDocument && (
        <AddDocumentDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onAddDocument={handleAddDocument}
          workflows={workflows}
        />
      )}
      
      {dashboardDocuments && dashboardDocuments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 mt-6">
          {dashboardDocuments.slice(0,8).map((doc) => (
            <DocumentCard key={doc.id} document={doc} workflows={workflows} departments={departments} currentUser={currentUser} />
          ))}
        </div>
      ) : (
         <div className="text-center py-16 border-2 border-dashed rounded-lg mt-6">
            <h2 className="text-xl font-semibold">All Caught Up!</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">You have no documents pending action. Add a new document to get started.</p>
             {canAddDocument && (
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Add Document
              </Button>
             )}
        </div>
      )}
    </>
  );
}

    
