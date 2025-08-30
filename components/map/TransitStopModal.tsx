'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bus, Train, Clock, MapPin, Wheelchair, AlertCircle } from 'lucide-react';
import { transitService, TransitStop, TransitDeparture, TransitRouteType } from '@/lib/transitService';

interface TransitStopModalProps {
  stop: TransitStop | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransitStopModal({ stop, isOpen, onClose }: TransitStopModalProps) {
  const [departures, setDepartures] = useState<TransitDeparture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load departures when modal opens
  useEffect(() => {
    if (!stop || !isOpen) return;

    const loadDepartures = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const now = new Date();
        const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Next 2 hours
        const departureData = await transitService.getStopDepartures(stop.id, now, endTime);
        setDepartures(departureData.slice(0, 10)); // Limit to 10 departures
      } catch (err) {
        console.error('Failed to load departures:', err);
        setError('Failed to load departure times');
      } finally {
        setLoading(false);
      }
    };

    loadDepartures();
  }, [stop, isOpen]);

  const getTransitIcon = (routeName: string) => {
    const name = routeName?.toLowerCase() || '';
    if (name.includes('subway') || name.includes('metro') || name.includes('rail')) {
      return <Train className="w-4 h-4" />;
    }
    return <Bus className="w-4 h-4" />;
  };

  const getRouteTypeColor = (routeName: string) => {
    const name = routeName?.toLowerCase() || '';
    if (name.includes('subway') || name.includes('metro')) return 'bg-blue-500';
    if (name.includes('rail')) return 'bg-red-500';
    if (name.includes('bus')) return 'bg-green-500';
    if (name.includes('ferry')) return 'bg-cyan-500';
    if (name.includes('tram')) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeUntil = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    
    if (diffMin < 1) return 'Now';
    if (diffMin === 1) return '1 min';
    return `${diffMin} min`;
  };

  if (!stop) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {stop.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stop Info */}
          <div className="flex gap-2">
            {stop.wheelchairAccessible && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Wheelchair className="w-3 h-3" />
                Accessible
              </Badge>
            )}
            {stop.platformCode && (
              <Badge variant="outline">
                Platform {stop.platformCode}
              </Badge>
            )}
          </div>

          {/* Departures */}
          <Tabs defaultValue="departures" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="departures" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Departures
              </TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="departures" className="space-y-2">
              {loading && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Loading departures...
                </div>
              )}

              {error && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="flex items-center gap-2 p-3">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-orange-700">{error}</span>
                  </CardContent>
                </Card>
              )}

              {!loading && !error && departures.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  No upcoming departures found
                </div>
              )}

              {departures.map((departure, index) => (
                <Card key={index} className="border-l-4" style={{ borderLeftColor: getRouteTypeColor(departure.routeName) }}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTransitIcon(departure.routeName)}
                        <div>
                          <div className="font-medium text-sm">{departure.routeName}</div>
                          <div className="text-xs text-gray-600">{departure.headsign}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">
                          {getTimeUntil(departure.realtimeTime || departure.scheduledTime)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(departure.realtimeTime || departure.scheduledTime)}
                        </div>
                        {departure.delay && departure.delay > 60 && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            +{Math.floor(departure.delay / 60)}min
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="info" className="space-y-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Stop Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stop ID:</span>
                    <span className="font-mono text-xs">{stop.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="text-xs">
                      {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                    </span>
                  </div>
                  {stop.platformCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform:</span>
                      <span>{stop.platformCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accessibility:</span>
                    <span>{stop.wheelchairAccessible ? 'Yes' : 'Unknown'}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}