
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProcessingTimesChart } from '@/components/charts/processing-times-chart';
import { WorkflowEfficiencyChart } from '@/components/charts/workflow-efficiency-chart';
import { useAppContext } from '@/context/app-context';
import type { Document, Department, Workflow } from '@/lib/types';
import { differenceInDays, format, getMonth, getYear, subMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export function ReportsView() {
    const { currentUser } = useAppContext();
    const firestore = useFirestore();

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

    const reportData = useMemo(() => {
        if (!documents || !departments || !currentUser || !workflows) {
            return null;
        }

        const isPrivilegedUser = currentUser.role === 'Administrator';
        
        const relevantDocuments = isPrivilegedUser
            ? documents
            : documents.filter(doc => {
                if (!doc.workflowId) return false;
                const workflow = workflows.find(w => w.id === doc.workflowId);
                return workflow?.departmentIds.includes(currentUser.departmentId || '');
            });

        const totalDocuments = relevantDocuments.length;
        const activeWorkflows = relevantDocuments.filter(doc => doc.status === 'In-Progress').length;
        const totalRejected = relevantDocuments.filter(d => d.status === 'Rejected').length;
        
        const now = new Date();
        const oneMonthAgo = subMonths(now, 1);
        const completedLastMonth = relevantDocuments.filter(doc => {
            if (doc.status !== 'Completed') return false;
             const lastHistoryEntry = doc.history[doc.history.length - 1];
             if (!lastHistoryEntry?.timestamp) return false;
             const completionDate = new Date(lastHistoryEntry.timestamp);
             return completionDate >= oneMonthAgo;
        }).length;

        // Calculate processing times
        const deptTimes: { [key: string]: number[] } = {};
        relevantDocuments.forEach(doc => {
            for (let i = 0; i < doc.history.length; i++) {
                const currentStep = doc.history[i];
                if (!currentStep) continue;

                // We can only calculate a duration if a step is no longer pending.
                if (currentStep.status === 'Pending' || currentStep.status === 'Upcoming') {
                    continue;
                }

                const startTime = new Date(currentStep.timestamp);
                let endTime;

                const nextStep = doc.history[i + 1];
                if (nextStep) {
                    // If there's a next step, the duration is the time until the next step was created.
                    endTime = new Date(nextStep.timestamp);
                } else if (doc.status === 'Completed' || doc.status === 'Rejected') {
                    // If this is the final step of a finished workflow, the end time is its own timestamp.
                    // The duration calculation will be based on the start of this step vs the start of the previous step.
                    // This is a bit tricky. A better approach is to calculate from start of step to end of step.
                    // The end of a step is when it's actioned (Approved/Rejected).
                    // The start of a step is when it becomes 'Pending'.
                    
                    // Let's refine the logic.
                    // Duration = (Timestamp of Approval/Rejection) - (Timestamp of becoming Pending)
                    // The `currentStep.timestamp` IS the timestamp of the action.
                    // To find the start time, we need the timestamp of the PREVIOUS history item.
                    const prevStep = doc.history[i - 1];
                    let stepStartTime;

                    if (prevStep) {
                        stepStartTime = new Date(prevStep.timestamp);
                    } else {
                        // This is the first step. The start time is when it was initiated.
                        stepStartTime = new Date(doc.history[0].timestamp);
                    }

                    endTime = new Date(currentStep.timestamp); // The time the action was taken
                    
                    const duration = differenceInDays(endTime, stepStartTime);

                    if (!deptTimes[currentStep.departmentId]) {
                        deptTimes[currentStep.departmentId] = [];
                    }
                    deptTimes[currentStep.departmentId].push(duration >= 0 ? duration : 0);
                    
                }
            }
        });

        const avgDeptTimes = Object.entries(deptTimes)
            .map(([deptId, times]) => {
                const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
                const department = departments.find(d => d.id === deptId);
                return {
                    department: department?.name || 'Unknown',
                    time: parseFloat(avg.toFixed(1)),
                };
            })
            // Only include departments that are relevant to the user (unless privileged)
            .filter(d => isPrivilegedUser || d.department === departments.find(dep => dep.id === currentUser.departmentId)?.name);
        
        const bottleneckDept = avgDeptTimes.reduce((max, current) => (current.time > max.time ? current : max), { department: 'N/A', time: 0 });

        // Calculate workflow efficiency data
        const months = Array.from({ length: 6 }, (_, i) => subMonths(now, i)).reverse();
        const monthlyData = months.map(monthDate => ({
            date: format(monthDate, 'MMM'),
            year: getYear(monthDate),
            month: getMonth(monthDate),
            completed: 0,
            in_progress: 0,
        }));

        relevantDocuments.forEach(doc => {
            const lastUpdateEntry = doc.history[doc.history.length - 1];
            if (!lastUpdateEntry?.timestamp) return;

            const docDate = new Date(lastUpdateEntry.timestamp);
            const docYear = getYear(docDate);
            const docMonth = getMonth(docDate);

            const monthData = monthlyData.find(m => m.year === docYear && m.month === docMonth);

            if (monthData) {
                if (doc.status === 'Completed') {
                    monthData.completed += 1;
                } else if (doc.status === 'In-Progress') {
                    monthData.in_progress += 1;
                }
            }
        });

        return {
            totalDocuments,
            activeWorkflows,
            completedLastMonth,
            totalRejected,
            bottleneckDept,
            processingTimes: avgDeptTimes,
            workflowEfficiency: monthlyData,
        };

    }, [documents, departments, currentUser, workflows]);

    if (!reportData) {
      return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points=" १४ 2 14 8 20 8" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalDocuments}</div>
                        <p className="text-xs text-muted-foreground">+{reportData.completedLastMonth} completed this month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="m12 18-3-3 3-3"/><path d="M18 18h-6"/><path d="M6 6h6"/><path d="m12 6 3 3-3 3"/></svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.activeWorkflows}</div>
                        <p className="text-xs text-muted-foreground">Currently in progress</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected Documents</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalRejected}</div>
                        <p className="text-xs text-muted-foreground">Total rejected documents</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bottleneck Dept</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M12 19V5"/><path d="M5 12H2"/><path d="M19 12h3"/><path d="M5 12A7 7 0 0 1 12 5"/><path d="M12 19a7 7 0 0 1-7-7"/></svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.bottleneckDept.department}</div>
                        <p className="text-xs text-muted-foreground">Avg. {reportData.bottleneckDept.time.toFixed(1)} days per document</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Document Processing Times</CardTitle>
                        <CardDescription>Average time (in days) a document spends in each department.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProcessingTimesChart data={reportData.processingTimes} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Workflow Efficiency</CardTitle>
                        <CardDescription>Number of documents completed vs. in progress over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <WorkflowEfficiencyChart data={reportData.workflowEfficiency} />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

    