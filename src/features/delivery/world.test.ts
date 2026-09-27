import { describe, expect, it } from 'vitest';
import { streetRoute, worldPoint } from './world';
describe('painted town routes', () => {
  it('keeps all 81 trips on the painted streets, including harbor stops', () => {
    for(let from=0;from<9;from++)for(let to=0;to<9;to++){
      const route=streetRoute(from,to);
      expect(route[0]).toEqual(worldPoint(from));
      expect(route.at(-1)).toEqual(worldPoint(to));
      expect(route.length).toBeLessThanOrEqual(7);
      for(let i=1;i<route.length;i++){
        const a=route[i-1],b=route[i];
        if(a.x===b.x)expect([32.6,65.5]).toContain(a.x);
        else {expect(a.y).toBe(b.y);expect([27,54]).toContain(a.y);}
      }
    }
  });
});
