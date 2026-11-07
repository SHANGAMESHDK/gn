import type { RefObject } from 'react';

/** The AR direction arrow lives in the DOM; ArCamera updates it every frame without re-rendering React. */
export const arArrow: RefObject<HTMLDivElement> = { current: null as unknown as HTMLDivElement };
