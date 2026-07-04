import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OptionsSelect } from '@/components/ui/select';
import { transportService, TransportStop } from '@/services/transportService';
import { getAllUsers } from '@/services/dataService';

export default function AdminTransportPage() {
  const { id: routeId = '' } = (useParams() as { id?: string }) || {};
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('stops');

  // Stop Form State
  const [showStopForm, setShowStopForm] = useState(false);
  const [stopForm, setStopForm] = useState({ name: '', pickup_time: '', drop_time: '', fare: 0, sequence: 0 });
  const [editingStop, setEditingStop] = useState<TransportStop | null>(null);

  // Assignment State
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStop, setSelectedStop] = useState('');
  const [studentLookup, setStudentLookup] = useState('');

  // Queries
  const { data: routeRes, isLoading: routeLoading } = useQuery({
    queryKey: ['admin-route', routeId],
    queryFn: () => transportService.getRoute(routeId),
    enabled: !!routeId,
  });

  const { data: stopsRes, isLoading: stopsLoading, refetch: refetchStops } = useQuery({
    queryKey: ['admin-route-stops', routeId],
    queryFn: () => transportService.getStops(routeId),
    enabled: !!routeId && activeTab === 'stops',
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAllUsers,
  });

  const route = routeRes?.data;
  const stops = stopsRes?.data || [];
  const students = usersData.filter((u) => u.role === 'student');

  const filteredStudents = students.filter((s) => {
    if (!studentLookup) return true;
    const q = studentLookup.toLowerCase();
    return (
      s.displayName?.toLowerCase().includes(q) ||
      s.studentId?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  // Mutations
  const createStopMutation = useMutation({
    mutationFn: (data: typeof stopForm) => transportService.createStop({ route_id: routeId, ...data }),
    onSuccess: () => {
      toast.success('Stop created');
      setStopForm({ name: '', pickup_time: '', drop_time: '', fare: 0, sequence: stops.length + 1 });
      setShowStopForm(false);
      refetchStops();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create stop'),
  });

  const updateStopMutation = useMutation({
    mutationFn: (data: TransportStop) => transportService.updateStop(data.id, data),
    onSuccess: () => {
      toast.success('Stop updated');
      setEditingStop(null);
      refetchStops();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update stop'),
  });

  const deleteStopMutation = useMutation({
    mutationFn: (id: string) => transportService.deleteStop(id),
    onSuccess: () => {
      toast.success('Stop deleted');
      refetchStops();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete stop'),
  });

  const assignStudentMutation = useMutation({
    mutationFn: (data: { student_id: string; route_id: string; stop_id?: string }) =>
      transportService.assignStudent(data),
    onSuccess: () => {
      toast.success('Student assigned to transport');
      setSelectedStudent('');
      setSelectedStop('');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to assign student'),
  });

  const handleStopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopForm.name.trim()) return;
    createStopMutation.mutate(stopForm);
  };

  const handleStopEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStop || !editingStop.name.trim()) return;
    updateStopMutation.mutate(editingStop);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedStop) {
      toast.error('Please select both a student and a stop');
      return;
    }
    assignStudentMutation.mutate({
      student_id: selectedStudent,
      route_id: routeId,
      stop_id: selectedStop,
    });
  };

  return (
    <>
      <SEOHead title={route ? `Route: ${route.name}` : 'Route Configuration'} description="Manage transport route stops and roster allocations" />
      <div className="sm:p-6 p-4 max-w-5xl mx-auto pb-32 space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/admin/transport">
              <Icon name="arrow_back" size={16} />
            </Link>
          </Button>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-headline-sm font-bold tracking-tight">{route?.name || 'Loading Route...'}</h1>
            {route && (
              <p className="text-body-sm text-muted-foreground mt-0.5">
                Vehicle: {route.vehicle_number || 'N/A'} • Driver: {route.driver_name || 'N/A'}
              </p>
            )}
          </motion.div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="stops">Stops & Schedule</TabsTrigger>
            <TabsTrigger value="allocations">Student Roster</TabsTrigger>
          </TabsList>

          <TabsContent value="stops" className="space-y-6 outline-none">
            <div className="flex justify-between items-center">
              <h2 className="text-title-sm font-semibold text-foreground">Stops Checklist</h2>
              {!showStopForm && !editingStop && (
                <Button onClick={() => setShowStopForm(true)}>
                  <Icon name="add" size={16} className="mr-1.5" />
                  Add Stop
                </Button>
              )}
            </div>

            {(showStopForm || editingStop) && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-title-sm">
                    {editingStop ? 'Edit Stop' : 'Add Stop to Route'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={editingStop ? handleStopEditSubmit : handleStopSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-label-sm text-muted-foreground mb-1 block">Stop Name *</label>
                        <Input
                          placeholder="e.g. City Mall Crossing"
                          value={editingStop ? editingStop.name : stopForm.name}
                          onChange={(e) =>
                            editingStop
                              ? setEditingStop({ ...editingStop, name: e.target.value })
                              : setStopForm({ ...stopForm, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Pickup Time</label>
                        <Input
                          placeholder="e.g. 07:30 AM"
                          value={editingStop ? editingStop.pickup_time || '' : stopForm.pickup_time}
                          onChange={(e) =>
                            editingStop
                              ? setEditingStop({ ...editingStop, pickup_time: e.target.value })
                              : setStopForm({ ...stopForm, pickup_time: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Drop Time</label>
                        <Input
                          placeholder="e.g. 03:45 PM"
                          value={editingStop ? editingStop.drop_time || '' : stopForm.drop_time}
                          onChange={(e) =>
                            editingStop
                              ? setEditingStop({ ...editingStop, drop_time: e.target.value })
                              : setStopForm({ ...stopForm, drop_time: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Fare (Monthly)</label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={editingStop ? editingStop.fare || 0 : stopForm.fare}
                          onChange={(e) =>
                            editingStop
                              ? setEditingStop({ ...editingStop, fare: parseFloat(e.target.value) || 0 })
                              : setStopForm({ ...stopForm, fare: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowStopForm(false);
                          setEditingStop(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={createStopMutation.isPending || updateStopMutation.isPending}>
                        Save Stop
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <DataFetchWrapper
              data={stops}
              isLoading={stopsLoading}
              onRetry={refetchStops}
              loadingType="table"
            >
              {() => (
                <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3">Sequence</th>
                        <th className="px-6 py-3">Stop Name</th>
                        <th className="px-6 py-3">Pickup Time</th>
                        <th className="px-6 py-3">Drop Time</th>
                        <th className="px-6 py-3 text-right">Fare</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm">
                      {stops.map((stop: TransportStop, idx: number) => (
                        <tr key={stop.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-primary">{stop.sequence || idx + 1}</td>
                          <td className="px-6 py-4 font-semibold">{stop.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{stop.pickup_time || 'N/A'}</td>
                          <td className="px-6 py-4 text-muted-foreground">{stop.drop_time || 'N/A'}</td>
                          <td className="px-6 py-4 text-right font-mono">Rs. {stop.fare?.toFixed(2) || '0.00'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingStop(stop)}>
                                <Icon name="edit" size={16} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-error hover:text-error hover:bg-error-container/20"
                                onClick={() => {
                                  if (confirm(`Remove stop "${stop.name}"?`)) {
                                    deleteStopMutation.mutate(stop.id);
                                  }
                                }}
                              >
                                <Icon name="delete" size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {stops.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-muted-foreground">
                            No stops added to this route yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="allocations" className="space-y-6 outline-none">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-title-sm">Assign Student to Transport</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAssignSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-label-sm text-muted-foreground block">Find Student</label>
                    <Input
                      placeholder="Type student name..."
                      value={studentLookup}
                      onChange={(e) => setStudentLookup(e.target.value)}
                    />
                    {studentLookup && (
                      <div className="absolute z-10 bg-card border border-border/60 max-h-40 overflow-y-auto rounded-lg shadow-lg w-full max-w-[280px]">
                        {filteredStudents.slice(0, 5).map((s) => (
                          <div
                            key={s.id}
                            className="p-2 hover:bg-muted/50 cursor-pointer text-title-sm font-semibold"
                            onClick={() => {
                              setSelectedStudent(s.id);
                              setStudentLookup(s.displayName || '');
                            }}
                          >
                            {s.displayName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-label-sm text-muted-foreground mb-1 block">Select Stop</label>
                    <OptionsSelect
                      options={stops.map((st: TransportStop) => ({ value: st.id, label: st.name }))}
                      value={selectedStop}
                      onValueChange={setSelectedStop}
                      className="w-full"
                    />
                  </div>
                  <Button type="submit" loading={assignStudentMutation.isPending}>
                    Assign Student
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
