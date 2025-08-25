import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

const MapContainer = dynamic(
  () => import('./MapContainer'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }
);

export type DynamicMapProps = ComponentProps<typeof MapContainer>;

export default function DynamicMap(props: DynamicMapProps) {
  return <MapContainer {...props} />;
}