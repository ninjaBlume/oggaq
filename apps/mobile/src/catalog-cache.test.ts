import { afterEach, expect, it, vi } from 'vitest';
import { CatalogCache } from './catalog-cache';
afterEach(()=>vi.restoreAllMocks());
it('reuses a catalog within its context/filter, expires it and bounds retained entries',async()=>{
 let now=0;vi.spyOn(Date,'now').mockImplementation(()=>now);
 const cache=new CatalogCache(60_000,2);const signal=new AbortController().signal;const load=vi.fn(async()=>['exam']);
 await cache.read('context-a:armed',signal,load);await cache.read('context-a:armed',signal,load);expect(load).toHaveBeenCalledTimes(1);
 await cache.read('context-b:armed',signal,load);await cache.read('context-a:unarmed',signal,load);await cache.read('context-a:armed',signal,load);expect(load).toHaveBeenCalledTimes(4);
 now=60_001;await cache.read('context-a:armed',signal,load);expect(load).toHaveBeenCalledTimes(5);
});
it('does not cache failed or cancelled requests',async()=>{
 const cache=new CatalogCache();const controller=new AbortController();controller.abort();const load=vi.fn(async()=>['exam']);
 await cache.read('catalog',controller.signal,load);await cache.read('catalog',new AbortController().signal,load);expect(load).toHaveBeenCalledTimes(2);
 const fail=vi.fn(async()=>{throw new Error('network');});await expect(cache.read('failure',new AbortController().signal,fail)).rejects.toThrow('network');await expect(cache.read('failure',new AbortController().signal,fail)).rejects.toThrow('network');expect(fail).toHaveBeenCalledTimes(2);
});
