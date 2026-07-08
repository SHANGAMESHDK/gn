import { useMemo } from 'react';

export type TurnAction = 'straight' | 'left' | 'right' | 'arrive' | 'slight-left' | 'slight-right';

export interface TurnInstruction {
  action: TurnAction;
  distance: number;
  message: string;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => deg * Math.PI / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);

  const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

export function useNavigationDirections(
  currentLat: number | null,
  currentLng: number | null,
  routeData: any
): {
  currentInstruction: TurnInstruction | null;
  cameraBearing: number;
} {
  return useMemo(() => {
    if (!currentLat || !currentLng || !routeData || !routeData.coordinates || routeData.coordinates.length < 2) {
      return { currentInstruction: null, cameraBearing: 0 };
    }

    const coords = routeData.coordinates;
    
    // Find closest segment to current GPS
    let minDistance = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const distToP1 = calculateDistance(currentLat, currentLng, p1.latitude, p1.longitude);
      if (distToP1 < minDistance) {
        minDistance = distToP1;
        closestIndex = i;
      }
    }
    
    // Check if we are closer to the next point than the current point, meaning we've passed it
    if (closestIndex < coords.length - 1) {
        const nextPt = coords[closestIndex + 1];
        const distToNext = calculateDistance(currentLat, currentLng, nextPt.latitude, nextPt.longitude);
        if (distToNext < minDistance) {
            closestIndex = closestIndex + 1;
        }
    }

    // Determine target coordinate (the next point on the path)
    const nextIdx = Math.min(closestIndex + 1, coords.length - 1);
    const targetPt = coords[nextIdx];
    
    const distToTarget = calculateDistance(currentLat, currentLng, targetPt.latitude, targetPt.longitude);
    const cameraBearing = calculateBearing(currentLat, currentLng, targetPt.latitude, targetPt.longitude);

    // Calculate turn type at the target point
    let action: TurnAction = 'straight';
    let message = 'Head straight';
    
    if (nextIdx === coords.length - 1) {
      action = 'arrive';
      message = 'Arrive at destination';
    } else {
      const futurePt = coords[nextIdx + 1];
      const bearing1 = calculateBearing(coords[closestIndex].latitude, coords[closestIndex].longitude, targetPt.latitude, targetPt.longitude);
      const bearing2 = calculateBearing(targetPt.latitude, targetPt.longitude, futurePt.latitude, futurePt.longitude);
      
      let diff = bearing2 - bearing1;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      
      if (diff < -45) {
        action = 'left';
        message = 'Turn left';
      } else if (diff > 45) {
        action = 'right';
        message = 'Turn right';
      } else if (diff < -15) {
        action = 'slight-left';
        message = 'Slight left';
      } else if (diff > 15) {
        action = 'slight-right';
        message = 'Slight right';
      }
    }

    return {
      currentInstruction: {
        action,
        distance: Math.round(distToTarget),
        message
      },
      cameraBearing
    };
  }, [currentLat, currentLng, routeData]);
}
