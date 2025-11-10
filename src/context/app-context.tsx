
'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  useAuth,
} from '@/firebase';
import {
  collection,
  doc,
  DocumentReference,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { Document, DocumentHistory, Workflow, Department, User } from '@/lib/types';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth as getAuthSecondary } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

interface AppContextType {
  currentUser: User | null;
  workflows: Workflow[];
  departments: Department[];
  addDocument: (doc: Omit<Document, 'id' | 'history' | 'currentStep' | 'status' | 'pendingDepartmentId' | 'workflowId' >, workflowId: string) => void;
  updateDocument: (docId: string, updates: Partial<Document>) => void;
  deleteDocument: (docId: string) => void;
  addDocumentHistory: (docId: string, historyEntry: Partial<DocumentHistory>, isNewStep?: boolean, currentStep?: number, currentHistory?: DocumentHistory[]) => void;
  addWorkflow: (workflow: Omit<Workflow, 'id'>) => Promise<DocumentReference | undefined>;
  updateWorkflow: (workflowId: string, updates: Partial<Omit<Workflow, 'id'>>) => void;
  addUser: (user: Omit<User, 'id'>, password: string) => Promise<void>;
  updateUserRole: (userId: string, role: User['role']) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: authUser } = useUser();

  const currentUserRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);
  const { data: currentUserData } = useDoc<User>(currentUserRef);
  const currentUser = useMemo(() => currentUserData, [currentUserData]);

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
  
  const addWorkflow = (workflow: Omit<Workflow, 'id'>) => {
    if (!firestore) throw new Error("Firestore not available");
    const workflowsCol = collection(firestore, 'workflows');
    return addDocumentNonBlocking(workflowsCol, workflow);
  };
  
  const updateWorkflow = (workflowId: string, updates: Partial<Omit<Workflow, 'id'>>) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'workflows', workflowId);
    updateDocumentNonBlocking(docRef, updates);
  };

  const addDocument = (docData: Omit<Document, 'id' | 'history' | 'currentStep' | 'status' | 'pendingDepartmentId' | 'workflowId'>) => {
    if (!firestore || !currentUser) return;
    
    const documentsCol = collection(firestore, 'documents');
    // Document is created without a workflow initially
    const newDoc: Omit<Document, 'id'> = {
      ...docData,
      workflowId: '', // Initially no workflow
      currentStep: -1, // No step
      history: [],
      status: 'In-Progress', // Or a new status like 'Draft'
      pendingDepartmentId: '',
    };
    addDocumentNonBlocking(documentsCol, newDoc);
  };

  const updateDocument = (docId: string, updates: Partial<Document>) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'documents', docId);
    updateDocumentNonBlocking(docRef, updates);
  };

  const deleteDocument = (docId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'documents', docId);
    deleteDocumentNonBlocking(docRef);
  };
  
  const addDocumentHistory = (docId: string, historyEntry: Partial<DocumentHistory>, isNewStep = false, currentStep = 0, currentHistory: DocumentHistory[] = []) => {
      if (!firestore) return;
      
      let newHistory = [...currentHistory];
      
      if (isNewStep) {
          // Add a completely new history entry for the next step
          if (!historyEntry.departmentId || !historyEntry.status || !historyEntry.timestamp) {
            console.error("A new history step must be a complete DocumentHistory object.");
            return;
          }
          newHistory.push(historyEntry as DocumentHistory);
      } else {
          // Update the status, notes, and fileUrl of the CURRENT step in the history
          const currentStepIndex = currentStep;
          if (newHistory[currentStepIndex]) {
            newHistory[currentStepIndex] = { ...newHistory[currentStepIndex], ...historyEntry };
          } else {
            console.error("Attempted to update a history step that doesn't exist.");
            return;
          }
      }
      
      const docRef = doc(firestore, 'documents', docId);
      updateDocumentNonBlocking(docRef, { history: newHistory });
  };
  
  const addUser = async (userData: Omit<User, 'id'>, password: string) => {
    if (!firestore) throw new Error("Firestore service not available");

    // Create a secondary Firebase app instance to isolate the auth operation
    const secondaryAppName = 'secondary-auth-app';
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuthSecondary(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, password);
        const user = userCredential.user;
        
        const userDocRef = doc(firestore, 'users', user.uid);
        const { name, email, role, departmentId, persalNumber } = userData;
        
        // Save user data to Firestore
        await setDocumentNonBlocking(userDocRef, {
            id: user.uid,
            name,
            email,
            persalNumber,
            role,
            departmentId,
        }, { merge: true });

    } catch (error) {
        // Re-throw the error to be caught by the calling component
        throw error;
    } finally {
        // Clean up: delete the secondary app instance
        await deleteApp(secondaryApp);
    }
  }

  const updateUserRole = (userId: string, role: User['role']) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'users', userId);
    updateDocumentNonBlocking(docRef, { role });
  };

  const value: AppContextType = {
    currentUser,
    workflows,
    departments,
    addDocument,
    updateDocument,
    deleteDocument,
    addDocumentHistory,
    addWorkflow,
    updateWorkflow,
    addUser,
    updateUserRole,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

    