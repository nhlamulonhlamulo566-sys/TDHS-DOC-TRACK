

export interface Department {
  id: string;
  name: string;
  icon: keyof typeof import('lucide-react')['icons'];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  departmentIds: string[];
}

export interface DocumentHistory {
  departmentId: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Upcoming' | 'Completed';
  timestamp: string;
  notes?: string;
  fileUrl?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
  fileUrl?: string;
  workflowId: string;
  currentStep: number;
  history: DocumentHistory[];
  status: 'In-Progress' | 'Completed' | 'Rejected';
  pendingDepartmentId?: string; // New field for efficient querying
}

export interface User {
  id: string;
  name: string;
  email: string;
  persalNumber: string;
  role: 'Administrator' | 'Deputy Director' | 'Assistant Director' | 'Chief Director' | 'Personal Assistant' | 'Other';
  departmentId?: string;
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    timestamp: string;
    isRead: boolean;
}
