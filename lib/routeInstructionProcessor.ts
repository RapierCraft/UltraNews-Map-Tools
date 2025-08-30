// Route instruction processor to convert OSRM data into Google Maps-style directions

export interface ProcessedRouteStep {
  instructions: string;
  distance_m: number;
  duration_s: number;
  maneuver: {
    type: string;
    modifier?: string;
    bearing_after?: number;
    bearing_before?: number;
  };
  road_name?: string;
  exit_number?: string;
  traffic_duration_s?: number;
}

interface OSRMStep {
  distance: number;
  duration: number;
  geometry: any;
  maneuver: {
    type: string;
    modifier?: string;
    bearing_after?: number;
    bearing_before?: number;
    location: [number, number];
    instruction?: string;
  };
  name?: string;
  ref?: string;
  destinations?: string;
  exits?: string;
  mode: string;
  weight: number;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  } else if (meters >= 100) {
    return `${Math.round(meters / 10) * 10} m`;
  } else {
    return `${Math.round(meters)} m`;
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

function getDirectionFromBearing(bearing: number): string {
  const directions = [
    'north', 'northeast', 'east', 'southeast',
    'south', 'southwest', 'west', 'northwest'
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

function generateTurnInstruction(maneuver: OSRMStep['maneuver'], roadName?: string, distance?: number): string {
  const { type, modifier } = maneuver;
  const distanceText = distance ? ` for ${formatDistance(distance)}` : '';
  const roadText = roadName ? ` onto ${roadName}` : '';

  switch (type) {
    case 'depart':
      const direction = maneuver.bearing_after ? getDirectionFromBearing(maneuver.bearing_after) : '';
      return `Head ${direction}${roadName ? ` on ${roadName}` : ''}${distanceText}`;
    
    case 'turn':
      if (modifier === 'left') {
        return `Turn left${roadText}${distanceText}`;
      } else if (modifier === 'right') {
        return `Turn right${roadText}${distanceText}`;
      } else if (modifier === 'slight left') {
        return `Keep left${roadText}${distanceText}`;
      } else if (modifier === 'slight right') {
        return `Keep right${roadText}${distanceText}`;
      } else if (modifier === 'sharp left') {
        return `Make a sharp left${roadText}${distanceText}`;
      } else if (modifier === 'sharp right') {
        return `Make a sharp right${roadText}${distanceText}`;
      }
      return `Turn${roadText}${distanceText}`;
    
    case 'merge':
      if (modifier === 'left') {
        return `Merge left${roadText}${distanceText}`;
      } else if (modifier === 'right') {
        return `Merge right${roadText}${distanceText}`;
      }
      return `Merge${roadText}${distanceText}`;
    
    case 'ramp':
      if (modifier === 'left') {
        return `Take the ramp on the left${roadText}${distanceText}`;
      } else if (modifier === 'right') {
        return `Take the ramp on the right${roadText}${distanceText}`;
      }
      return `Take the ramp${roadText}${distanceText}`;
    
    case 'on ramp':
      return `Take the on-ramp${roadText}${distanceText}`;
    
    case 'off ramp':
      return `Take the off-ramp${roadText}${distanceText}`;
    
    case 'fork':
      if (modifier === 'left') {
        return `Keep left at the fork${roadText}${distanceText}`;
      } else if (modifier === 'right') {
        return `Keep right at the fork${roadText}${distanceText}`;
      }
      return `Continue at the fork${roadText}${distanceText}`;
    
    case 'end of road':
      if (modifier === 'left') {
        return `Turn left at the end of the road${roadText}${distanceText}`;
      } else if (modifier === 'right') {
        return `Turn right at the end of the road${roadText}${distanceText}`;
      }
      return `Continue at the end of the road${roadText}${distanceText}`;
    
    case 'continue':
    case 'new name':
      return `Continue${roadName ? ` on ${roadName}` : ''}${distanceText}`;
    
    case 'roundabout':
      const exit = maneuver.instruction?.match(/(\d+)/)?.[1] || '1';
      return `Enter the roundabout and take the ${getOrdinal(parseInt(exit))} exit${roadText}${distanceText}`;
    
    case 'rotary':
      return `Enter the rotary${roadText}${distanceText}`;
    
    case 'roundabout turn':
      return `At the roundabout, turn${roadText}${distanceText}`;
    
    case 'notification':
      return `Continue${roadText}${distanceText}`;
    
    case 'arrive':
      return `Arrive at your destination${roadName ? ` on ${roadName}` : ''}`;
    
    default:
      return `Continue${roadText}${distanceText}`;
  }
}

function getOrdinal(num: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function cleanRoadName(name?: string): string | undefined {
  if (!name || name === '') return undefined;
  
  // Remove common prefixes that make names verbose
  const cleanName = name
    .replace(/^(State Route |SR |Highway |Hwy |Interstate |I-|US |Route )/i, '')
    .trim();
  
  return cleanName || undefined;
}

function categorizeRoadType(name?: string, ref?: string): 'highway' | 'major' | 'local' {
  if (!name && !ref) return 'local';
  
  const roadName = (name || ref || '').toLowerCase();
  
  if (roadName.includes('highway') || 
      roadName.includes('interstate') || 
      roadName.includes('freeway') ||
      roadName.includes('expressway') ||
      roadName.match(/^(i-|us |sr |state route)/)) {
    return 'highway';
  }
  
  if (roadName.includes('boulevard') || 
      roadName.includes('avenue') || 
      roadName.includes('main') ||
      roadName.includes('road') ||
      roadName.match(/^(a|b|m)\d+$/)) {
    return 'major';
  }
  
  return 'local';
}

export function processOSRMSteps(osrmSteps: OSRMStep[]): ProcessedRouteStep[] {
  if (!osrmSteps || osrmSteps.length === 0) {
    return [];
  }

  return osrmSteps.map((step, index) => {
    const roadName = cleanRoadName(step.name || step.ref);
    const roadType = categorizeRoadType(step.name, step.ref);
    
    // Generate Google Maps-style instruction
    const instruction = generateTurnInstruction(
      step.maneuver, 
      roadName, 
      step.distance
    );

    return {
      instructions: instruction,
      distance_m: step.distance,
      duration_s: step.duration,
      traffic_duration_s: step.duration, // No traffic data from OSRM
      maneuver: {
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        bearing_after: step.maneuver.bearing_after,
        bearing_before: step.maneuver.bearing_before,
      },
      road_name: roadName,
      exit_number: step.exits,
    };
  });
}

// Generate route highlights for overview (first few major steps)
export function generateRouteHighlights(steps: ProcessedRouteStep[]): string[] {
  if (!steps || steps.length === 0) {
    return ['Direct route calculated'];
  }

  // Filter for major maneuvers and longer segments
  const majorSteps = steps.filter((step, index) => {
    // Always include the first step (departure)
    if (index === 0) return true;
    
    // Include last step if it's arrival
    if (index === steps.length - 1 && step.maneuver.type === 'arrive') return true;
    
    // Include steps with significant distance (>1km) or major turns
    if (step.distance_m > 1000) return true;
    
    // Include highway merges, ramps, and major turns
    if (['merge', 'ramp', 'on ramp', 'off ramp', 'fork'].includes(step.maneuver.type)) return true;
    
    // Include regular turns on major roads
    if (step.maneuver.type === 'turn' && step.road_name) return true;
    
    return false;
  });

  // Take up to 4-5 major steps for highlights
  return majorSteps.slice(0, 5).map(step => step.instructions);
}

export function estimateTolls(steps: ProcessedRouteStep[]): { amount: number; currency: string; locations: number } | undefined {
  // Basic toll estimation - in a real app this would use toll road database
  const tollRoads = steps.filter(step => 
    step.road_name?.toLowerCase().includes('toll') ||
    step.road_name?.toLowerCase().includes('turnpike') ||
    step.road_name?.toLowerCase().includes('express')
  );

  if (tollRoads.length > 0) {
    return {
      amount: tollRoads.length * 2.5, // Rough estimate
      currency: 'USD',
      locations: tollRoads.length
    };
  }

  return undefined;
}

export function estimateFuelConsumption(totalDistanceM: number): { liters: number; cost_estimate: number } {
  // Rough estimation - 8L/100km average, $1.50/L
  const distanceKm = totalDistanceM / 1000;
  const liters = (distanceKm / 100) * 8;
  const cost = liters * 1.50;
  
  return {
    liters,
    cost_estimate: cost
  };
}