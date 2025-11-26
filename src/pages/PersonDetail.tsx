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
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Linkedin, Building2, Users, Briefcase } from 'lucide-react';
import PersonFormDialog from '@/components/PersonFormDialog';

interface Person {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  firm_id?: number | null;
  team_id?: number | null;
  role?: string | null;
  linkedin_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface Employment {
  id: number;
  person_id: number;
  firm_id?: number | null;
  team_id?: number | null;
  job_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  firm_name?: string;
  team_name?: string;
}

interface Firm {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
}

const PersonDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [firm, setFirm] = useState<Firm | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadPersonDetails();
      loadEmploymentHistory();
      loadFirms();
      loadTeams();
    }
  }, [id]);

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
    try {
      const result = await window.api.team.list();
      if (result.success && result.teams) {
        setTeams(result.teams);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadPersonDetails = async () => {
    setLoading(true);
    try {
      const result = await window.api.people.getById(parseInt(id!));
      if (result.success && result.person) {
        setPerson(result.person);
        
        // Load firm details if person has firm_id
        if (result.person.firm_id) {
          const firmResult = await window.api.firm.getById(result.person.firm_id);
          if (firmResult.success && firmResult.firm) {
            setFirm(firmResult.firm);
          }
        }

        // Load team details if person has team_id
        if (result.person.team_id) {
          const teamResult = await window.api.team.getById(result.person.team_id);
          if (teamResult.success && teamResult.team) {
            setTeam(teamResult.team);
          }
        }
      } else {
        alert('Person not found');
        navigate('/people');
      }
    } catch (error) {
      console.error('Failed to load person:', error);
      alert('Failed to load person details');
      navigate('/people');
    } finally {
      setLoading(false);
    }
  };

  const loadEmploymentHistory = async () => {
    try {
      const result = await window.api.people.getEmploymentHistory(parseInt(id!));
      if (result.success && result.employments) {
        setEmployments(result.employments);
      }
    } catch (error) {
      console.error('Failed to load employment history:', error);
    }
  };

  const handleEditPerson = () => {
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = (shouldRefresh: boolean) => {
    setIsEditDialogOpen(false);
    if (shouldRefresh) {
      loadPersonDetails();
    }
  };

  const handleDeletePerson = async () => {
    if (!confirm('Are you sure you want to delete this person? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await window.api.people.delete(parseInt(id!));
      if (result.success) {
        navigate('/people');
      } else {
        alert('Failed to delete person: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete person:', error);
      alert('Failed to delete person');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-muted-foreground">Loading person details...</div>
      </div>
    );
  }

  if (!person) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/people')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to People
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {person.first_name} {person.last_name}
            </h1>
            {person.role && (
              <p className="text-muted-foreground">{person.role}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditPerson}>
            Edit Person
          </Button>
          <Button variant="destructive" onClick={handleDeletePerson}>
            Delete Person
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Full Name</div>
              <div className="text-base">
                {person.first_name} {person.last_name}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div className="text-base">
                {person.email ? (
                  <a href={`mailto:${person.email}`} className="flex items-center text-blue-600 hover:underline">
                    <Mail className="w-4 h-4 mr-2" />
                    {person.email}
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Phone</div>
              <div className="text-base">
                {person.phone ? (
                  <a href={`tel:${person.phone}`} className="flex items-center text-blue-600 hover:underline">
                    <Phone className="w-4 h-4 mr-2" />
                    {person.phone}
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">LinkedIn</div>
              <div className="text-base">
                {person.linkedin_url ? (
                  <a
                    href={person.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    View Profile
                  </a>
                ) : (
                  '—'
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Role</div>
              <div className="text-base">{person.role || '—'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Firm</div>
              <div className="text-base">
                {firm ? (
                  <button
                    onClick={() => navigate(`/firms/${firm.id}`)}
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    {firm.name}
                  </button>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Team</div>
              <div className="text-base">
                {team ? (
                  <button
                    onClick={() => navigate(`/teams/${team.id}`)}
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {team.name}
                  </button>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Created</div>
              <div className="text-base">
                {new Date(person.created_at).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
              <div className="text-base">
                {new Date(person.updated_at).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employment History</CardTitle>
              <CardDescription>Career timeline and previous positions</CardDescription>
            </div>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {employments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employment history recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Firm</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employments.map(employment => (
                  <TableRow key={employment.id}>
                    <TableCell className="font-medium">
                      {employment.job_title || '—'}
                    </TableCell>
                    <TableCell>{employment.firm_name || '—'}</TableCell>
                    <TableCell>{employment.team_name || '—'}</TableCell>
                    <TableCell>
                      {employment.start_date
                        ? new Date(employment.start_date).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {employment.end_date
                        ? new Date(employment.end_date).toLocaleDateString()
                        : 'Present'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          employment.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {employment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PersonFormDialog
        open={isEditDialogOpen}
        onClose={handleDialogClose}
        person={person}
        firms={firms}
        teams={teams}
      />
    </div>
  );
};

export default PersonDetail;
