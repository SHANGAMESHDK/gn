import type { RefObject } from 'react';

/** All <Html> labels render into this div (beside the canvas), not inside the canvas wrapper. */
export const labelPortal: RefObject<HTMLDivElement> = { current: null as unknown as HTMLDivElement };
