'use client';

import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Activity,
  ArrowRight,
  Calendar,
  DollarSign,
  Gauge,
  Ruler,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface FlowLineInfoProps {
  flow: {
    id: string;
    name: string;
    specifications?: {
      capacity?: string;
      diameter?: string;
      length?: string;
      cost?: string;
      operational?: string;
    };
    status?: string;
    operational?: boolean;
    refugeeCount?: string;
    route?: string;
    color: string;
  };
}

const getStatusConfig = (operational?: boolean, status?: string) => {
  if (operational === false || status === 'destroyed') {
    return {
      icon: XCircle,
      label: 'Non-operational',
      color: 'bg-red-50 text-red-700 border-red-200'
    };
  } else if (status?.includes('Increased') || status?.includes('Activated')) {
    return {
      icon: Activity,
      label: 'Enhanced Operation',
      color: 'bg-green-50 text-green-700 border-green-200'
    };
  } else {
    return {
      icon: CheckCircle,
      label: 'Operational',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  }
};

export default function FlowLineInfo({ flow }: FlowLineInfoProps) {
  const { theme } = useTheme();
  const statusConfig = getStatusConfig(flow.operational, flow.status);
  const StatusIcon = statusConfig.icon;
  
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-gray-900/95' : 'bg-white/95';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subtextColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const itemBg = isDark ? 'bg-gray-800' : 'bg-gray-50';

  return (
    <Card className={`w-80 shadow-lg border-0 ${cardBg} backdrop-blur-sm`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className={`text-lg font-bold ${textColor} mb-2`}>
              {flow.name}
            </CardTitle>
            <Badge variant="secondary" className={`${statusConfig.color} border text-xs font-medium`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Infrastructure Specifications */}
        {flow.specifications && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold ${subtextColor} flex items-center gap-2`}>
              <Activity className="w-4 h-4" />
              Infrastructure Details
            </h4>
            <div className="grid gap-3">
              {flow.specifications.capacity && (
                <div className={`flex items-center justify-between p-3 ${itemBg} rounded-lg`}>
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    <span className={`text-sm font-medium ${subtextColor}`}>Capacity</span>
                  </div>
                  <span className={`text-sm font-semibold ${textColor}`}>
                    {flow.specifications.capacity}
                  </span>
                </div>
              )}
              
              {flow.specifications.diameter && (
                <div className={`flex items-center justify-between p-3 ${itemBg} rounded-lg`}>
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-gray-600" />
                    <span className={`text-sm font-medium ${subtextColor}`}>Diameter</span>
                  </div>
                  <span className={`text-sm font-semibold ${textColor}`}>
                    {flow.specifications.diameter}
                  </span>
                </div>
              )}
              
              {flow.specifications.length && (
                <div className={`flex items-center justify-between p-3 ${itemBg} rounded-lg`}>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-gray-600" />
                    <span className={`text-sm font-medium ${subtextColor}`}>Length</span>
                  </div>
                  <span className={`text-sm font-semibold ${textColor}`}>
                    {flow.specifications.length}
                  </span>
                </div>
              )}
              
              {flow.specifications.cost && (
                <div className={`flex items-center justify-between p-3 ${itemBg} rounded-lg`}>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className={`text-sm font-medium ${subtextColor}`}>Construction Cost</span>
                  </div>
                  <span className={`text-sm font-semibold ${textColor}`}>
                    {flow.specifications.cost}
                  </span>
                </div>
              )}
              
              {flow.specifications.operational && (
                <div className={`flex items-center justify-between p-3 ${itemBg} rounded-lg`}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className={`text-sm font-medium ${subtextColor}`}>Operational Period</span>
                  </div>
                  <span className={`text-sm font-semibold ${textColor}`}>
                    {flow.specifications.operational}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refugee Flow Information */}
        {flow.refugeeCount && (
          <div className="space-y-3">
            <Separator />
            <h4 className={`text-sm font-semibold ${subtextColor} flex items-center gap-2`}>
              <ArrowRight className="w-4 h-4" />
              Migration Flow
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-sm font-medium text-orange-700">Refugees</span>
                <span className="text-sm font-bold text-orange-900">{flow.refugeeCount}</span>
              </div>
              {flow.route && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-sm font-medium text-orange-700">Route</span>
                  <span className="text-sm font-semibold text-orange-900">{flow.route}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Information */}
        {flow.status && (
          <div className="pt-2">
            <Separator className="mb-3" />
            <div className={`p-3 rounded-lg border ${statusConfig.color}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Current Status</span>
              </div>
              <p className="text-sm mt-1 font-semibold">
                {flow.status}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}