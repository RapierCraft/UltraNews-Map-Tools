'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import DynamicMap from '@/components/map/DynamicMap';
import { MapPin, Users, Activity, Settings } from 'lucide-react';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'tracking' | 'analytics'>('overview');

  const stats = [
    { label: 'Active Markers', value: '24', icon: MapPin, change: '+12%' },
    { label: 'Live Users', value: '142', icon: Users, change: '+5%' },
    { label: 'Updates/min', value: '89', icon: Activity, change: '+23%' },
    { label: 'Systems', value: '3', icon: Settings, change: '0%' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Live Map Systems Dashboard</h1>
            <div className="flex gap-2">
              <Button
                variant={activeView === 'overview' ? 'default' : 'outline'}
                onClick={() => setActiveView('overview')}
              >
                Overview
              </Button>
              <Button
                variant={activeView === 'tracking' ? 'default' : 'outline'}
                onClick={() => setActiveView('tracking')}
              >
                Live Tracking
              </Button>
              <Button
                variant={activeView === 'analytics' ? 'default' : 'outline'}
                onClick={() => setActiveView('analytics')}
              >
                Analytics
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className={stat.change.startsWith('+') ? 'text-green-600' : ''}>
                    {stat.change}
                  </span>
                  {' '}from last hour
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Map Views */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {activeView === 'overview' && 'Map Overview'}
                {activeView === 'tracking' && 'Live Tracking'}
                {activeView === 'analytics' && 'Heat Map Analytics'}
              </CardTitle>
              <CardDescription>
                Real-time map data visualization
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px] relative">
                <DynamicMap
                  center={[40.7128, -74.0060]}
                  zoom={11}
                  markers={[
                    { id: '1', position: [40.7128, -74.0060], popup: 'Central Station' },
                    { id: '2', position: [40.7580, -73.9855], popup: 'Times Square' },
                    { id: '3', position: [40.7614, -73.9776], popup: 'Museum' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search">Search Location</Label>
                  <Input
                    id="search"
                    placeholder="Enter address or coordinates..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="radius">Radius (km)</Label>
                  <Input
                    id="radius"
                    type="number"
                    placeholder="10"
                    className="mt-1"
                  />
                </div>
                <Button className="w-full">Apply Filters</Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { time: '2 min ago', event: 'New marker added at Broadway' },
                    { time: '5 min ago', event: 'User location updated' },
                    { time: '12 min ago', event: 'Zone alert triggered' },
                    { time: '18 min ago', event: 'System connected' },
                  ].map((activity, i) => (
                    <div key={i} className="flex justify-between items-start text-sm">
                      <span className="text-muted-foreground">{activity.time}</span>
                      <span className="text-right ml-2">{activity.event}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}