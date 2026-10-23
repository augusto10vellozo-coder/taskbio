import { expect, it } from 'vitest';
import { newRest, restRemaining, pauseRest, extendRest } from './rest-timer';
it('starts at 60s, adds 15s and uses timestamp after leaving the screen', () => {
 const s=newRest(1000); expect(restRemaining(s,1000)).toBe(60000);
 const e=extendRest(s,1000);expect(restRemaining(e,1000)).toBe(75000);expect(restRemaining(JSON.parse(JSON.stringify(e)),11000)).toBe(65000);
});
it('pause freezes remainder and resume continues, expiration stays at zero', () => {
 const s=pauseRest(newRest(1000),11000);expect(restRemaining(s,99000)).toBe(50000);
 const resumed=pauseRest(s,99000);expect(restRemaining(resumed,100000)).toBe(49000);expect(restRemaining(resumed,200000)).toBe(0);
});
it('marking another set restarts at 60 seconds', () => {expect(restRemaining(newRest(45000),45000)).toBe(60000);});
