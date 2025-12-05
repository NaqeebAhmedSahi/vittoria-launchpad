import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Users, Building2, SquarePen, Trash2, X } from 'lucide-react';
import TeamFormDialog from '@/components/TeamFormDialog';

interface Team {
  id: number;
  name: string;
  firm_id?: number | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

interface Firm {
  id: number;
  name: string;
}

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFirm, setSelectedFirm] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadFirms();
    loadTeams();
  }, [page, pageSize]);

  const loadFirms = async () => {
    try {
      const result = await window.api.firm.list();
      if (result.success && result.firms) {
        setFirms(result.firms);
      }
    } catch (error) {
      console.error('Failed to load firms:', error);
    }
  };

  const loadTeams = async () => {
    setLoading(true);
    try {
      const filters: any = {
        page,
        pageSize,
      };

      if (selectedFirm !== 'all') {
        filters.firm_id = parseInt(selectedFirm);
      }

      const result = await window.api.team.listPaged(filters);
      if (result.success && result.teams) {
        setTeams(result.teams);
        setTotal(result.total ?? 0);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFirmChange = (value: string) => {
    setSelectedFirm(value);
    setPage(1);
    loadTeams();
  };

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize) || 1);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handlePageSizeChange = (value: string) => {
    const nextSize = parseInt(value, 10) || 10;
    setPageSize(nextSize);
    setPage(1);
  };

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setIsDialogOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setIsDialogOpen(true);
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const result = await window.api.team.delete(teamId);
      if (result.success) {
        loadTeams();
      } else {
        alert('Failed to delete team: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('Failed to delete team');
    }
  };

  const handleDialogClose = (shouldRefresh: boolean) => {
    setIsDialogOpen(false);
    setEditingTeam(null);
    if (shouldRefresh) {
      loadTeams();
    }
  };

  const getFirmName = (firmId?: number | null) => {
    if (!firmId) return '—';
    const firm = firms.find(f => f.id === firmId);
    return firm?.name || '—';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedTeam ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Teams</h1>
              <p className="text-muted-foreground">Manage teams and organizational structure</p>
            </div>
            <Button onClick={handleCreateTeam}>
              <Plus className="w-4 h-4 mr-2" />
              New Team
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Associated Firms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(teams.filter(t => t.firm_id).map(t => t.firm_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Teams</CardTitle>
              <CardDescription>View and manage your teams</CardDescription>
            </div>
            <Select value={selectedFirm} onValueChange={handleFirmChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by firm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Firms</SelectItem>
                {firms.map(firm => (
                  <SelectItem key={firm.id} value={firm.id.toString()}>
                    {firm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading teams...</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No teams found. Create your first team to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Firm</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map(team => (
                    <TableRow
                      key={team.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTeam(team)}
                    >
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{getFirmName(team.firm_id)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {team.description || '—'}
                      </TableCell>
                      <TableCell>
                        {new Date(team.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTeam(team);
                          }}
                        >
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(team.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Items per page</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={handlePageSizeChange}
                    >
                      <SelectTrigger className="h-8 w-[80px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {total > 0 ? (
                      (() => {
                        const start = (page - 1) * pageSize + 1;
                        const end = Math.min(page * pageSize, total);
                        return (
                          <span>
                            Showing {start}-{end} of {total} teams
                          </span>
                        );
                      })()
                    ) : (
                      <span>Showing 0 teams</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    {"<"}
                  </Button>
                  <div className="px-2 text-xs min-w-[56px] text-center">
                    Page {page} of {isNaN(totalPages) ? 1 : totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    {">"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
        </div>

        {/* Detail Panel */}
        {selectedTeam && (
          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Team Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTeam(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Team Name</label>
                  <p className="text-lg font-semibold mt-1">{selectedTeam.name}</p>
                </div>

                {selectedTeam.firm_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Firm</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p>{getFirmName(selectedTeam.firm_id)}</p>
                    </div>
                  </div>
                )}

                {selectedTeam.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1 text-sm">{selectedTeam.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedTeam.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedTeam.updated_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTeam(selectedTeam);
                      }}
                    >
                      <SquarePen className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/teams/${selectedTeam.id}`)}
                    >
                      View Full Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <TeamFormDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        team={editingTeam}
        firms={firms}
      />
    </div>
  );
}
