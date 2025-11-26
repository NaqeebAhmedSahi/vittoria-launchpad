import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Users, Search, Mail, Phone, Linkedin, SquarePen, Trash2, X } from 'lucide-react';
import PersonFormDialog from '@/components/PersonFormDialog.tsx';

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

interface Firm {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
}

export default function People() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFirm, setSelectedFirm] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  useEffect(() => {
    loadFirms();
    loadTeams();
    loadPeople();
  }, []);

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

  const loadPeople = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedFirm !== 'all') filters.firm_id = parseInt(selectedFirm);
      if (selectedTeam !== 'all') filters.team_id = parseInt(selectedTeam);

      const result = await window.api.people.list(filters);
      if (result.success && result.people) {
        setPeople(result.people);
      }
    } catch (error) {
      console.error('Failed to load people:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPeople();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedFirm, selectedTeam]);

  const handleCreatePerson = () => {
    setEditingPerson(null);
    setIsDialogOpen(true);
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setIsDialogOpen(true);
  };

  const handleDeletePerson = async (personId: number) => {
    if (!confirm('Are you sure you want to delete this person?')) return;

    try {
      const result = await window.api.people.delete(personId);
      if (result.success) {
        loadPeople();
      } else {
        alert('Failed to delete person: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete person:', error);
      alert('Failed to delete person');
    }
  };

  const handleDialogClose = (shouldRefresh: boolean) => {
    setIsDialogOpen(false);
    setEditingPerson(null);
    if (shouldRefresh) {
      loadPeople();
    }
  };

  const getFirmName = (firmId?: number | null) => {
    if (!firmId) return '—';
    const firm = firms.find(f => f.id === firmId);
    return firm?.name || '—';
  };

  const getTeamName = (teamId?: number | null) => {
    if (!teamId) return '—';
    const team = teams.find(t => t.id === teamId);
    return team?.name || '—';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedPerson ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">People</h1>
              <p className="text-muted-foreground">Manage people and contacts</p>
            </div>
            <Button onClick={handleCreatePerson}>
              <Plus className="w-4 h-4 mr-2" />
              New Person
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{people.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {people.filter(p => p.email).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With LinkedIn</CardTitle>
            <Linkedin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {people.filter(p => p.linkedin_url).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>All People</CardTitle>
              <CardDescription>View and manage your contacts</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Firms" />
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
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading people...</div>
          ) : people.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No people found. Create your first contact to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Firm</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map(person => (
                  <TableRow
                    key={person.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedPerson(person)}
                  >
                    <TableCell className="font-medium">
                      {person.first_name} {person.last_name}
                    </TableCell>
                    <TableCell>{person.role || '—'}</TableCell>
                    <TableCell>{getFirmName(person.firm_id)}</TableCell>
                    <TableCell>{getTeamName(person.team_id)}</TableCell>
                    <TableCell>
                      {person.email ? (
                        <a
                          href={`mailto:${person.email}`}
                          className="text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {person.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{person.phone || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPerson(person);
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
                          handleDeletePerson(person.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </div>

        {/* Detail Panel */}
        {selectedPerson && (
          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Person Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPerson(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold mt-1">
                    {selectedPerson.first_name} {selectedPerson.last_name}
                  </p>
                </div>

                {selectedPerson.role && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Role</label>
                    <p className="mt-1">{selectedPerson.role}</p>
                  </div>
                )}

                {selectedPerson.firm_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Firm</label>
                    <p className="mt-1">{getFirmName(selectedPerson.firm_id)}</p>
                  </div>
                )}

                {selectedPerson.team_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Team</label>
                    <p className="mt-1">{getTeamName(selectedPerson.team_id)}</p>
                  </div>
                )}

                {selectedPerson.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${selectedPerson.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedPerson.email}
                      </a>
                    </div>
                  </div>
                )}

                {selectedPerson.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`tel:${selectedPerson.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedPerson.phone}
                      </a>
                    </div>
                  </div>
                )}

                {selectedPerson.linkedin_url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">LinkedIn</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={selectedPerson.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Profile
                      </a>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPerson(selectedPerson);
                      }}
                    >
                      <SquarePen className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/people/${selectedPerson.id}`)}
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

      <PersonFormDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        person={editingPerson}
        firms={firms}
        teams={teams}
      />
    </div>
  );
}
