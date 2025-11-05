
"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Document } from '@/lib/types';


interface AddDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (document: Omit<Document, 'id' | 'pendingDepartmentId'>) => void;
}

export function AddDocumentDialog({ isOpen, onClose, onAddDocument }: AddDocumentDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [content, setContent] = useState('');

  const { toast } = useToast();

  const resetForm = () => {
    setName('');
    setType('');
    setContent('');
  }

  const handleClose = () => {
    resetForm();
    onClose();
  }

  const handleSubmit = () => {
    if (!name || !type || !content) {
      toast({
        title: 'Error',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
    const newDoc: Omit<Document, 'id'> = {
        name,
        type,
        content,
        workflowId: '',
        currentStep: 0,
        history: [],
        status: 'In-Progress'
    };
    onAddDocument(newDoc);
    toast({
        title: 'Document Added',
        description: `"${name}" has been created.`
    })
    
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Document</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new document.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh] px-1">
          <div className="space-y-2">
            <Label htmlFor="doc-name">Document Name</Label>
            <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Q3 Financial Report" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-type">Document Type</Label>
            <Input id="doc-type" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g., Invoice, HR Request" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-content">Content</Label>
            <Textarea id="doc-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste or summarize the document content here." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
