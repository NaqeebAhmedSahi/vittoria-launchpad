import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Activity, User, FileText, RefreshCw } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function AuditLog() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntity, setSelectedEntity] = useState<string>('all');
    const [selectedAction, setSelectedAction] = useState<string>('all');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showChangesDialog, setShowChangesDialog] = useState(false);

    useEffect(() => {
        loadLogs();
        // Auto-refresh every 5 seconds
        const interval = setInterval(loadLogs, 60000);
        return () => clearInterval(interval);
    }, [selectedEntity, selectedAction]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (selectedEntity !== 'all') filters.entity_type = selectedEntity;
            if (selectedAction !== 'all') filters.action = selectedAction;

            const result = await window.api.audit.list(filters);
            if (result.success && result.logs) {
                setLogs(result.logs);
            }
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATE':
                return 'default';
            case 'UPDATE':
                return 'secondary';
            case 'DELETE':
                return 'destructive';
            case 'VIEW':
                return 'outline';
            default:
                return 'outline';
        }
    };

    const getActionIcon = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATE':
                return <Activity className="w-4 h-4 text-green-500" />;
            case 'UPDATE':
                return <FileText className="w-4 h-4 text-blue-500" />;
            case 'DELETE':
                return <Shield className="w-4 h-4 text-red-500" />;
            case 'VIEW':
                return <User className="w-4 h-4 text-gray-500" />;
            default:
                return <Activity className="w-4 h-4" />;
        }
    };

    const handleViewChanges = (log: AuditLog) => {
        setSelectedLog(log);
        setShowChangesDialog(true);
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const activityStats = {
        total: logs.length,
        creates: logs.filter(l => l.action.toUpperCase() === 'CREATE').length,
        updates: logs.filter(l => l.action.toUpperCase() === 'UPDATE').length,
        deletes: logs.filter(l => l.action.toUpperCase() === 'DELETE').length,
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Audit Log</h1>
                    <p className="text-muted-foreground">System activity and change tracking</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activityStats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Created</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activityStats.creates}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Updated</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{activityStats.updates}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Deleted</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{activityStats.deletes}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>All system activities and changes (auto-refreshes every 60s)</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadLogs}
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="All Entities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Entities</SelectItem>
                                    <SelectItem value="firms">Firms</SelectItem>
                                    <SelectItem value="mandates">Mandates</SelectItem>
                                    <SelectItem value="candidates">Candidates</SelectItem>
                                    <SelectItem value="teams">Teams</SelectItem>
                                    <SelectItem value="people">People</SelectItem>
                                    <SelectItem value="documents">Documents</SelectItem>
                                    <SelectItem value="finance_transactions">Finance</SelectItem>
                                    <SelectItem value="users">Users</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={selectedAction} onValueChange={setSelectedAction}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="All Actions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    <SelectItem value="CREATE">Create</SelectItem>
                                    <SelectItem value="UPDATE">Update</SelectItem>
                                    <SelectItem value="DELETE">Delete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No audit logs found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Performed By</TableHead>
                                    <TableHead className="text-right">Changes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map(log => (
                                    <TableRow key={log.id} className="hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs">
                                            {formatTimestamp(log.timestamp)}
                                        </TableCell>
                                        <TableCell className="font-medium capitalize">
                                            {log.entity_type}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            #{log.entity_id}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action)}
                                                <Badge variant={getActionColor(log.action)}>
                                                    {log.action}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {log.performer_name || `User #${log.performed_by}` || 'System'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {log.changes ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewChanges(log)}
                                                >
                                                    View Changes
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Change Details</DialogTitle>
                        <DialogDescription>
                            {selectedLog && (
                                <>
                                    {selectedLog.action} on {selectedLog.entity_type} #{selectedLog.entity_id}
                                    <br />
                                    <span className="text-xs">
                                        {formatTimestamp(selectedLog.timestamp)} by {selectedLog.performer_name || 'System'}
                                    </span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLog?.changes && (
                        <div className="mt-4 overflow-y-auto flex-1">
                            <div className="bg-muted rounded-md">
                                <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                                    {JSON.stringify(selectedLog.changes, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
