import { calculateDistance, calculateBearing } from '../hooks/useNavigationDirections';
import type { TurnAction, TurnInstruction } from '../hooks/useNavigationDirections';

export function generateTurnByTurnDirections(coordinates: any[]): TurnInstruction[] {
  if (!coordinates || coordinates.length < 2) return [];

  const instructions: TurnInstruction[] = [];
  let currentDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    
    // Add distance to the next point
    currentDistance += calculateDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);

    if (i === coordinates.length - 2) {
      // Arriving at destination
      instructions.push({
        action: 'arrive',
        distance: Math.round(currentDistance),
        message: 'Arrive at destination'
      });
      break;
    }

    const p3 = coordinates[i + 2];
    const bearing1 = calculateBearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    const bearing2 = calculateBearing(p2.latitude, p2.longitude, p3.latitude, p3.longitude);

    let diff = bearing2 - bearing1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    let action: TurnAction | null = null;
    let message = '';

    if (diff < -45) {
      action = 'left';
      message = 'Turn left';
    } else if (diff > 45) {
      action = 'right';
      message = 'Turn right';
    } else if (diff < -20) {
      action = 'slight-left';
      message = 'Slight left';
    } else if (diff > 20) {
      action = 'slight-right';
      message = 'Slight right';
    }

    if (action) {
      instructions.push({
        action: 'straight',
        distance: Math.round(currentDistance),
        message: `Head straight for ${Math.round(currentDistance)}m`
      });
      
      // We don't add the turn as a step with distance 0, we just set it up.
      // Actually, standard TBT lists turns, so let's list the turn directly.
      instructions.push({
        action,
        distance: 0,
        message
      });
      currentDistance = 0; // reset distance counter after a turn
    }
  }

  // Clean up consecutive straights or 0 distance turns
  const cleanInstructions = instructions.filter(i => !(i.action === 'straight' && i.distance === 0));

  // If there are no turns at all, just a straight line
  if (cleanInstructions.length === 1 && cleanInstructions[0].action === 'arrive') {
      return [
          { action: 'straight', distance: cleanInstructions[0].distance, message: `Head straight for ${cleanInstructions[0].distance}m` },
          cleanInstructions[0]
      ];
  }

  return cleanInstructions;
}
