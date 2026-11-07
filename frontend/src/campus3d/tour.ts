import { buildings } from './data';

const TOUR = ['Main Block', 'Civil Block', 'TRP', 'OAT', 'Mechanical Block', 'Office', 'Block 2', 'Block 3', 'EB Block', 'Academic Block', 'Girls Hostel', 'Temple', 'Playground'];

/** Grand Tour order. */
export const tourStops = TOUR.map((n) => buildings.find((b) => b.sourceName === n)).filter(Boolean) as typeof buildings;
