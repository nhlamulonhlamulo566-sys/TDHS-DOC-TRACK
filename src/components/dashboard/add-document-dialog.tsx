
"use client"

import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
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
import type { Document, Workflow } from '@/lib/types';
import { FileCheck, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileContext } from '@/context/file-context';
import { Progress } from '@/components/ui/progress';


interface AddDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (document: Omit<Document, 'id' | 'pendingDepartmentId' | 'history' | 'currentStep' | 'status' | 'workflowId' >) => void;
  workflows: Workflow[];
}

export function AddDocumentDialog({ isOpen, onClose, onAddDocument, workflows }: AddDocumentDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { storeFile } = useFileContext();

  const { toast } = useToast();

  const resetForm = () => {
    setName('');
    setType('');
    setContent('');
    setFile(null);
    setUploadProgress(0);
  }

  const handleClose = () => {
    if (isLoading) return;
    resetForm();
    onClose();
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
        } else {
            toast({
                title: 'Invalid File Type',
                description: 'Please select a PDF file.',
                variant: 'destructive',
            });
            setFile(null);
            e.target.value = ''; // Reset the input
        }
    }
  }

  const handleSubmit = async () => {
    if (!name || !type || !content) {
      toast({
        title: 'Error',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
     if (!file) {
      toast({
        title: 'File Required',
        description: 'Please attach a document.',
        variant: 'destructive',
      });
      return;
    }


    setIsLoading(true);
    setUploadProgress(0);

    try {
        const fileUrl = await storeFile(file, setUploadProgress);

        const newDoc: Omit<Document, 'id' | 'pendingDepartmentId' | 'history' | 'currentStep' | 'status' | 'workflowId'> = {
            name,
            type,
            content,
            fileUrl,
        };
        onAddDocument(newDoc);
        toast({
            title: 'Document Added',
            description: `"${name}" has been created.`
        })
        
        handleClose();
    } catch (error) {
        toast({
            title: 'Upload Failed',
            description: 'Could not store the file. Please try again.',
            variant: 'destructive',
        })
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Document</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new document. You can assign a workflow later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh] px-1">
          <div className="space-y-2">
            <Label htmlFor="doc-name">Document Name</Label>
            <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Q3 Financial Report" disabled={isLoading}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-type">Document Type</Label>
            <Input id="doc-type" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g., Invoice, HR Request" disabled={isLoading}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-content">Content</Label>
            <Textarea id="doc-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste or summarize the document content here." disabled={isLoading}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-file">Attach Document (PDF only)</Label>
            <div className="flex items-center gap-4">
              <Label htmlFor="doc-file" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer", isLoading && "pointer-events-none opacity-50")}>
                <Upload className="mr-2 h-4 w-4" />
                {file ? 'Change file' : 'Choose file'}
              </Label>
              <Input id="doc-file" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" disabled={isLoading}/>
              {file && !isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileCheck className="h-5 w-5 text-green-500" /> <span>{file.name}</span></div>}
            </div>
          </div>
          {isLoading && (
            <div className="space-y-2">
              <Label>Attaching document...</Label>
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">{uploadProgress}%</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} 
            {isLoading ? 'Submitting...' : 'Add Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    