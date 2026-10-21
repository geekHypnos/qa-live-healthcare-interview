import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request, post, ApiError} from '../src/api/client.ts';

test('network and HTTP errors preserve distinct status', async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async()=>{throw new Error('offline')};
    await assert.rejects(()=>request('/doctors'),e=>e instanceof ApiError && e.status===0);
    globalThis.fetch=async()=>new Response('{"message":"请先登录"}',{status:401});
    await assert.rejects(()=>request('/auth/me'),e=>e.status===401);
    globalThis.fetch=async()=>new Response('<html>bad gateway</html>',{status:502});
    await assert.rejects(()=>request('/doctors'),e=>e.status===502);
  } finally {globalThis.fetch=original;}
});
test('each mutation requests fresh CSRF and keeps same-origin cookies',async()=>{
  const original=globalThis.fetch, seen=[];
  try {
    globalThis.fetch=async(url,options)=>{
      seen.push({url,options});
      return new Response(JSON.stringify(url.endsWith('/csrf')?{token:'new-token',headerName:'X-CSRF-TOKEN'}:{message:'ok'}));
    };
    await post('/auth/logout'); await post('/auth/logout');
    assert.deepEqual(seen.map(x=>x.url),['/api/auth/csrf','/api/auth/logout','/api/auth/csrf','/api/auth/logout']);
    assert.equal(seen[1].options.headers['X-CSRF-TOKEN'],'new-token');
    assert.equal(seen[1].options.credentials,'same-origin');
  }finally{globalThis.fetch=original;}
});
