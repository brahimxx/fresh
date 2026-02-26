'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await apiClient.get('/admin/audit-logs');
                setLogs(res.data);
            } catch (error) {
                console.error('Failed to load audit logs', error);
                toast.error('Failed to fetch audit ledger');
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const renderJsonDiff = (oldData, newData) => {
        // Safe parse stringified JSON if they are strings, otherwise assume objects
        let oldObj = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
        let newObj = typeof newData === 'string' ? JSON.parse(newData) : newData;

        if (!oldObj && !newObj) return <span className="text-muted-foreground italic">No data changes recorded.</span>;

        return (
            <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-muted/30 rounded-lg border text-sm font-mono overflow-auto max-h-96">
                <div>
                    <h4 className="font-semibold text-xs uppercase text-red-500 mb-2">Old Data</h4>
                    <pre className="whitespace-pre-wrap word-break">
                        {oldObj ? JSON.stringify(oldObj, null, 2) : 'null'}
                    </pre>
                </div>
                <div>
                    <h4 className="font-semibold text-xs uppercase text-green-500 mb-2">New Data</h4>
                    <pre className="whitespace-pre-wrap word-break">
                        {newObj ? JSON.stringify(newObj, null, 2) : 'null'}
                    </pre>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Audit Ledger</h1>
                <p className="text-muted-foreground mt-2">Immutable record of critical state changes across the platform.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Platform Activity
                    </CardTitle>
                    <CardDescription>Review the latest 100 historical modifications.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">Loading ledger...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">No audit logs found.</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Actor</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Entity</TableHead>
                                        <TableHead>IP Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <React.Fragment key={log.id}>
                                            <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleRow(log.id)}>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        {expandedRows.has(log.id) ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{log.user_email || 'System'}</div>
                                                    <div className="text-xs text-muted-foreground uppercase">{log.user_role || 'Auto'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="uppercase text-xs font-semibold">
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="capitalize">{log.entity_type}</span>
                                                    {log.entity_id && <span className="ml-1 text-muted-foreground">#{log.entity_id}</span>}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {log.ip_address || 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                            {expandedRows.has(log.id) && (
                                                <TableRow className="bg-muted/10">
                                                    <TableCell colSpan={6} className="p-0 border-b-0 pb-4 px-4">
                                                        {renderJsonDiff(log.old_data, log.new_data)}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
