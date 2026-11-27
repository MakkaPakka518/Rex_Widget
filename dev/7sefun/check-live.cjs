const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {load}=require('cheerio');
const proxy=(process.env.SEVEN_TEST_PROXY||'').replace(/\/+$/,'');
const calls=[],store=new Map();
function routed(url){if(proxy)assert.ok(url.startsWith(proxy+'/https://')||url.startsWith(proxy+'/http://'),'unexpected direct request');}
const ctx={console,Widget:{html:{load},storage:store,http:{get:async(url,opts)=>{routed(url);calls.push(url);const r=await fetch(url,{headers:opts.headers,redirect:opts.allow_redirects===false?'manual':'follow',signal:AbortSignal.timeout(18000)});return {data:await r.text(),status:r.status};}}}};
vm.runInNewContext(fs.readFileSync(require.resolve('../../7sefun.js'),'utf8'),ctx);
async function sample(url,headers){routed(url);const r=await fetch(url,{headers:{...headers,Range:'bytes=0-63'},redirect:proxy?'manual':'follow',signal:AbortSignal.timeout(18000)});const reader=r.body.getReader();try{const {value}=await reader.read();return {status:r.status,kind:r.headers.get('content-type'),mp4:value&&Buffer.from(value).subarray(4,8).toString()==='ftyp'};}finally{await reader.cancel();}}
(async()=>{
  for(const c of ['1','2','4','5']){const rows=await ctx.loadList({category:c,proxy});assert.ok(rows.length);rows.forEach(x=>routed(x.posterPath));console.log('category',c,rows.length);}
  const search=await ctx.search({keyword:'海贼王',page:1,proxy});assert.ok(search.length);console.log('search',search.length);
  const link='7sefun:tv:38712'+(proxy?':via':'');const show=await ctx.loadDetail(link);assert.ok(show.episodeItems.length>=2);const ep=show.episodeItems.find(e=>e.episode===2);assert.ok(ep);routed(show.posterPath);const cover=await sample(show.posterPath,show.headers);assert.match(cover.kind||'',/^image\//);console.log('cover',cover.status,cover.kind);
  const streams=await ctx.loadResource({link:ep.link,proxy});assert.ok(streams.length);let playable=0;
  for(const s of streams){const result=await sample(s.url,s.customHeaders);if((result.status===200||result.status===206)&&result.mp4)playable++;console.log('episode',ep.episode,s.name,result);}
  assert.ok(playable,'no MP4 sample verified');console.log(proxy?'proxy':'direct','module requests',calls.length,'verified mp4',playable);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
