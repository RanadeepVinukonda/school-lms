import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { transportService, TransportRoute } from '@/services/transportService';

export default function AdminTransportDashboard() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', vehicle_number: '', driver_name: '', driver_phone: '' });
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const { data: routesRes, isLoading, error } = useQuery({
    queryKey: ['admin-transport-routes'],
    queryFn: () => transportService.getRoutes(),
  });

  const routes = routesRes?.data || [];
  const createMutation = useMutation({
    mutationFn: (data: typeof form) => transportService.createRoute(data),
    onSuccess: () => {
      toast.success('Transport route created');
      setForm({ name: '', vehicle_number: '', driver_name: '', driver_phone: '' });
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin-transport-routes'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create route'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) =>
      transportService.updateRoute(data.id, data),
    onSuccess: () => {
      toast.success('Transport route updated');
      setEditingRoute(null);
      queryClient.invalidateQueries({ queryKey: ['admin-transport-routes'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update route'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transportService.deleteRoute(id),
    onSuccess: () => {
      toast.success('Transport route deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-transport-routes'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete route'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Route name is required');
      return;
    }
    createMutation.mutate(form);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoute || !editingRoute.name.trim()) return;
    updateMutation.mutate(editingRoute);
  };

  return (
    <>
      <SEOHead title="Transport Dashboard" description="Manage school transport routes and drivers" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Transport Management</h1>
            <p className="text-body-md text-muted-foreground mt-1">Manage transport routes, vehicles, stops, and allocations</p>
          </div>
          {!showAddForm && !editingRoute && (
            <Button onClick={() => setShowAddForm(true)} className="self-start">
              <Icon name="add" size={16} className="mr-1.5" />
              Add New Route
            </Button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingRoute) && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-title-sm">
                {editingRoute ? 'Edit Transport Route' : 'Add New Transport Route'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingRoute ? handleEditSubmit : handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-label-sm text-muted-foreground mb-1 block">Route Name *</label>
                    <Input
                      placeholder="e.g. Route A - North Zone"
                      value={editingRoute ? editingRoute.name : form.name}
                      onChange={(e) =>
                        editingRoute
                          ? setEditingRoute({ ...editingRoute, name: e.target.value })
                          : setForm({ ...form, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-label-sm text-muted-foreground mb-1 block">Vehicle Number</label>
                    <Input
                      placeholder="e.g. DL-1CA-1234"
                      value={editingRoute ? editingRoute.vehicle_number || '' : form.vehicle_number}
                      onChange={(e) =>
                        editingRoute
                          ? setEditingRoute({ ...editingRoute, vehicle_number: e.target.value })
                          : setForm({ ...form, vehicle_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-label-sm text-muted-foreground mb-1 block">Driver Name</label>
                    <Input
                      placeholder="e.g. Rajesh Kumar"
                      value={editingRoute ? editingRoute.driver_name || '' : form.driver_name}
                      onChange={(e) =>
                        editingRoute
                          ? setEditingRoute({ ...editingRoute, driver_name: e.target.value })
                          : setForm({ ...form, driver_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-label-sm text-muted-foreground mb-1 block">Driver Phone</label>
                    <Input
                      placeholder="e.g. 9876543210"
                      value={editingRoute ? editingRoute.driver_phone || '' : form.driver_phone}
                      onChange={(e) =>
                        editingRoute
                          ? setEditingRoute({ ...editingRoute, driver_phone: e.target.value })
                          : setForm({ ...form, driver_phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingRoute(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                    {editingRoute ? 'Save Changes' : 'Create Route'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <DataFetchWrapper
          data={routes}
          isLoading={isLoading}
          error={error}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['admin-transport-routes'] })}
          loadingType="card"
        >
          {() => (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {routes.map((route: TransportRoute) => (
                <Card key={route.id} className="border-border/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-title-sm font-semibold truncate">{route.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingRoute(route)}>
                          <Icon name="edit" size={16} className="text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-error hover:text-error hover:bg-error-container/20"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete route "${route.name}"?`)) {
                              deleteMutation.mutate(route.id);
                            }
                          }}
                        >
                          <Icon name="delete" size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-body-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Icon name="directions_bus" size={16} className="text-primary" />
                        <span>Vehicle: <strong className="text-foreground">{route.vehicle_number || 'N/A'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="person" size={16} className="text-success" />
                        <span>Driver: <strong className="text-foreground">{route.driver_name || 'N/A'}</strong></span>
                      </div>
                      {route.driver_phone && (
                        <div className="flex items-center gap-2">
                          <Icon name="phone" size={16} className="text-info" />
                          <span>Phone: <strong className="text-foreground">{route.driver_phone}</strong></span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={`/admin/transport/routes/${route.id}`}>
                        <Icon name="settings" size={16} className="mr-1.5" />
                        Configure Stops & Roster
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {routes.length === 0 && (
                <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
                  <Icon name="directions_bus" size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-title-sm font-semibold">No routes registered yet</p>
                  <p className="text-label-sm text-muted-foreground">Get started by creating a new transport route</p>
                </div>
              )}
            </div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
