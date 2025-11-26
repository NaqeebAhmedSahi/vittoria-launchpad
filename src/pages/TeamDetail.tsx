import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Users, Mail, Phone, Briefcase } from 'lucide-react';
import TeamFormDialog from '@/components/TeamFormDialog';

interface Team {
  id: number;
  name: string;
  firm_id?: number | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

interface Person {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  linkedin_url?: string | null;
}

interface Firm {
  id: number;
  name: string;
}

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [firm, setFirm] = useState<Firm | null>(null);
  const [members, setMembers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadTeamDetails();
      loadTeamMembers();
    }
  }, [id]);

  const loadTeamDetails = async () => {
    setLoading(true);
    try {
      const result = await window.api.team.getById(parseInt(id!));
      if (result.success && result.team) {
        setTeam(result.team);
        
        // Load firm details if team has firm_id
        if (result.team.firm_id) {
          const firmResult = await window.api.firm.getById(result.team.firm_id);
          if (firmResult.success && firmResult.firm) {
            setFirm(firmResult.firm);
          }
        }
      } else {
        alert('Team not found');
        navigate('/teams');
      }
    } catch (error) {
      console.error('Failed to load team:', error);
      alert('Failed to load team details');
      navigate('/teams');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const result = await window.api.team.getMembers(parseInt(id!));
      if (result.success && result.members) {
        setMembers(result.members);
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const handleEditTeam = () => {
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = (shouldRefresh: boolean) => {
    setIsEditDialogOpen(false);
    if (shouldRefresh) {
      loadTeamDetails();
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await window.api.team.delete(parseInt(id!));
      if (result.success) {
        navigate('/teams');
      } else {
        alert('Failed to delete team: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('Failed to delete team');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading team details...</div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/teams')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Teams
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            {firm && (
              <p className="text-muted-foreground">
                Part of {firm.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditTeam}>
            Edit Team
          </Button>
          <Button variant="destructive" onClick={handleDeleteTeam}>
            Delete Team
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Team Name</div>
              <div className="text-base">{team.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Associated Firm</div>
              <div className="text-base">{firm?.name || '—'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <div className="text-base">{team.description || '—'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="text-base">
                {new Date(team.created_at).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
              <div className="text-base">
                {new Date(team.updated_at).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              Active members in this team
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>People currently in this team</CardDescription>
            </div>
            <Button onClick={() => navigate('/people')}>
              View All People
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members in this team yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(member => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/people/${member.id}`)}
                  >
                    <TableCell className="font-medium">
                      {member.first_name} {member.last_name}
                    </TableCell>
                    <TableCell>{member.role || '—'}</TableCell>
                    <TableCell>
                      {member.email ? (
                        <a
                          href={`mailto:${member.email}`}
                          className="flex items-center text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          {member.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {member.phone ? (
                        <a
                          href={`tel:${member.phone}`}
                          className="flex items-center text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          {member.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/people/${member.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TeamFormDialog
        open={isEditDialogOpen}
        onClose={handleDialogClose}
        team={team}
        firms={firm ? [firm] : []}
      />
    </div>
  );
};

export default TeamDetail;
