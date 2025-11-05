

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { Document, Workflow, Department } from '@/lib/types';
import * as Lucide from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface DocumentCardProps {
  document: Document;
  workflows: Workflow[];
  departments: Department[];
  onEdit?: (document: Document) => void;
  onDelete?: (document: Document) => void;
}

export function DocumentCard({ document, workflows, departments, onEdit, onDelete }: DocumentCardProps) {
  const workflow = workflows.find((w) => w.id === document.workflowId);
  const currentStepInfo = document.history[document.history.length - 1];
  const currentDepartment = departments.find(d => d.id === currentStepInfo?.departmentId);

  const getStatusColor = (status: Document['status'] | Document['history'][number]['status'] | 'Upcoming') => {
    switch (status) {
      case 'Approved':
      case 'Completed':
        return 'bg-green-500';
      case 'Pending':
      case 'In-Progress':
        return 'bg-yellow-500';
      case 'Rejected':
        return 'bg-red-500';
      case 'Upcoming':
        return 'bg-gray-300 dark:bg-gray-600';
      default:
        return 'bg-gray-300 dark:bg-gray-600';
    }
  };

  const hasWorkflow = workflow && workflow.departmentIds.length > 0;

  const getOverallStatus = () => {
    if (!hasWorkflow) {
        return <Badge variant="destructive">No Workflow</Badge>;
    }
    if (document.status === 'Completed') {
        return (
            <Badge className="border-transparent bg-green-100 text-green-800">
              Completed
            </Badge>
        )
    }
    if (document.status === 'Rejected') {
        return (
            <Badge className="border-transparent bg-red-100 text-red-800">
              Rejected
            </Badge>
        )
    }
    if(!currentDepartment) {
        return <Badge variant="secondary">In-Progress</Badge>;
    }
    return (
        <Badge variant="secondary">
          {currentStepInfo?.status} at{' '}
          <span className="font-semibold ml-1">{currentDepartment?.name}</span>
        </Badge>
    )
  }


  return (
    <Card className="flex flex-col transition-all duration-200 hover:shadow-md hover:-translate-y-1">
       <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle className="truncate font-headline">{document.name}</CardTitle>
            <CardDescription>{document.type}</CardDescription>
        </div>
         {!hasWorkflow && onEdit && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(document)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(document)} className="text-destructive focus:text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          {getOverallStatus()}
          {currentStepInfo?.timestamp && (
            <p className="text-xs text-muted-foreground mt-1">
                Last update: {formatRelativeTime(currentStepInfo?.timestamp)}
            </p>
          )}
        </div>
        
        {hasWorkflow && (
            <div className="space-y-2">
            <p className="text-sm font-medium">Progress</p>
            <div className="flex items-center space-x-2">
                <TooltipProvider>
                {workflow?.departmentIds.map((deptId) => {
                    const stepDept = departments.find(d => d.id === deptId);
                    const historyStep = document.history.find(h => h.departmentId === deptId);
                    
                    let status: Document['history'][number]['status'] | 'Upcoming' = 'Upcoming';
                    if (historyStep) {
                        status = historyStep.status;
                    }

                    // @ts-ignore
                    const Icon = stepDept ? Lucide[stepDept.icon] : Lucide.HelpCircle;

                    return (
                    <Tooltip key={deptId}>
                        <TooltipTrigger>
                        <div className="flex flex-col items-center gap-1">
                            <div
                            className={cn(
                                'h-8 w-8 rounded-full flex items-center justify-center text-white',
                                getStatusColor(status)
                            )}
                            >
                            <Icon className="h-5 w-5" />
                            </div>
                        </div>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p className="font-semibold">{stepDept?.name}</p>
                        <p>Status: {status}</p>
                        {historyStep?.notes && <p>Notes: {historyStep.notes}</p>}
                        </TooltipContent>
                    </Tooltip>
                    );
                })}
                </TooltipProvider>
            </div>
            </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/documents/${document.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
