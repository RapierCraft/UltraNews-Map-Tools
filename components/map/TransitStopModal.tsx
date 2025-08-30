'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus, Train, MapPin, Wheelchair, Info } from 'lucide-react';
import { TransitStop } from '@/lib/transitService';

interface TransitStopModalProps {
  stop: TransitStop | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransitStopModal({ stop, isOpen, onClose }: TransitStopModalProps) {
  const getTransitIcon = (transitType?: string) => {
    const type = transitType?.toLowerCase() || '';
    if (type.includes('railway') || type.includes('train') || type.includes('rail')) {
      return <Train className="w-4 h-4" />;
    }
    return <Bus className="w-4 h-4" />;
  };

  const getStopTypeColor = (transitType?: string) => {
    const type = transitType?.toLowerCase() || '';
    if (type.includes('railway')) return 'bg-red-100 text-red-800';
    if (type.includes('tram')) return 'bg-orange-100 text-orange-800';
    if (type.includes('bus')) return 'bg-green-100 text-green-800';
    if (type.includes('ferry')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
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
          <div className="flex flex-wrap gap-2">
            {stop.transitType && (
              <Badge className={getStopTypeColor(stop.transitType)}>
                {getTransitIcon(stop.transitType)}
                <span className="ml-1">{stop.transitType}</span>
              </Badge>
            )}
            
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

          {/* Stop Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                Stop Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-600">Location:</div>
                <div className="text-xs font-mono">
                  {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                </div>
                
                {stop.operator && (
                  <>
                    <div className="text-gray-600">Operator:</div>
                    <div>{stop.operator}</div>
                  </>
                )}
                
                {stop.network && (
                  <>
                    <div className="text-gray-600">Network:</div>
                    <div>{stop.network}</div>
                  </>
                )}
                
                {stop.platformCode && (
                  <>
                    <div className="text-gray-600">Platform:</div>
                    <div>{stop.platformCode}</div>
                  </>
                )}
                
                <div className="text-gray-600">Accessibility:</div>
                <div>{stop.wheelchairAccessible ? 'Wheelchair Accessible' : 'Unknown'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Info Message */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <div className="font-medium mb-1">Transit Stop Information</div>
                  <div>
                    This data comes from OpenStreetMap. Real-time departures are not available.
                    For current schedules and real-time information, please check the transit operator's official app or website.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}