'use client';

import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [stars, setStars] = useState<Array<{ id: number; left: number; top: number; delay: number; duration: number }>>([]);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  
  useEffect(() => {
    // Generate stars on client side only
    setStars(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2
      }))
    );

    // Actually preload critical map tiles during loading
    const preloadTiles = async () => {
      try {
        setLoadingStatus('Loading world tiles...');
        // Preload essential tiles that are always needed
        const tilesToPreload = [
          // World tiles
          'http://localhost:8001/api/v1/tiles/osm/0/0/0.png',
          'http://localhost:8001/api/v1/tiles/osm/1/0/0.png',
          'http://localhost:8001/api/v1/tiles/osm/1/1/0.png',
          'http://localhost:8001/api/v1/tiles/osm/1/0/1.png',
          'http://localhost:8001/api/v1/tiles/osm/1/1/1.png',
          // Major regions
          'http://localhost:8001/api/v1/tiles/osm/3/2/2.png',
          'http://localhost:8001/api/v1/tiles/osm/3/3/2.png',
          'http://localhost:8001/api/v1/tiles/osm/3/2/3.png',
          'http://localhost:8001/api/v1/tiles/osm/3/3/3.png'
        ];

        setLoadingStatus('Caching map data...');
        await Promise.all(
          tilesToPreload.map(url => 
            fetch(url, { cache: 'force-cache' }).catch(() => {})
          )
        );

        setLoadingStatus('Ready!');
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        setLoadingStatus('Loading...');
      }
    };

    preloadTiles();
  }, []);
  
  return (
    <div className="w-full h-full bg-white dark:bg-black flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 dark:block hidden">
        <div className="star-field">
          {stars.map((star) => (
            <div 
              key={star.id}
              className="star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-center space-y-4 relative z-10">
        <img 
          src="/ultramaps-logo.png" 
          alt="UltraMaps" 
          className="w-16 h-16 mx-auto logo-glow"
        />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">UltraMaps</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{loadingStatus}</p>
      </div>
    </div>
  );
}