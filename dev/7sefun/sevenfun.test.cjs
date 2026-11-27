const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const {load}=require('cheerio'),{createCipheriv}=require('node:crypto');
const src=fs.readFileSync(require.resolve('../../7sefun.js'),'utf8'), site='https://www.7sefun.top', proxy='https://relay.example/prefix/';
const cards=`<div class="videos"><div class="video"><a class="video-wrapper" href="/voddetail/25.html"><img class="videoimg" src="//images.example/p.jpg" alt="片名"></a><div class="video-name">片名</div><div class="video-view">更新至2集</div></div></div>`;
const group=(name,sid,labels)=>`<div class="chat-header"><span class="chat-stream-bfq">${name}</span></div><div class="vod-play-list-container">${labels.map(([n,s])=>`<span><a href="/vodplay/25-${sid}-${n}.html">${s}</a></span>`).join('')}</div>`;
const detail='<div class="video-p-name">片名<span></span>热度：20°C</div><div class="video-author"><img class="author-img" src="https://images.example/p.jpg"></div><div class="video-p-subtitle">简介</div><div class="video-p-sub1">类型：奇幻</div>'+group('A线',1,[[1,'第01集'],[2,'第02集']])+group('B线',2,[[1,'SP'],[2,'第1集'],[3,'第2集']]);
const base64=s=>Buffer.from(encodeURIComponent(s)).toString('base64'),play=(sid,nid,from,url,encrypt=2)=>`<script>var player_aaaa=${JSON.stringify({id:'25',sid,nid,from,url:encrypt===2?base64(url):url,encrypt})};</script>`;
function runtime(routes={}){const calls=[],store=new Map(),ctx={console,Widget:{html:{load},storage:store,http:{get:async(u,opts)=>{calls.push([u,opts]);assert.ok(Object.hasOwn(routes,u),'unexpected: '+u);return typeof routes[u]==='string'?{data:routes[u],status:200}:routes[u];}}}};
  vm.runInNewContext(src,ctx);return {ctx,calls,store};}
test('catalog and search route every request and cover through an optional blank-by-default root',async()=>{
  const url=site+'/vodshow/2-'+encodeURIComponent('日本')+'-hits------2---2025.html';
  const query=site+'/vodsearch/'+encodeURIComponent('名 / A')+'----------2---.html';
  const {ctx,calls}=runtime({[proxy+url]:cards,[proxy+query]:cards.replace('>片名</div>','></div>').replace('video-view','video-time')});
  assert.equal(ctx.WidgetMetadata.globalParams[0].value,'');const [row]=await ctx.loadList({category:'2',area:'日本',year:'2025',order:'hits',page:2,proxy:proxy.slice(0,-1)});
  assert.equal(row.posterPath,proxy+'https://images.example/p.jpg');assert.equal(row.mediaType,'movie');assert.equal(row.durationText,'更新至2集');assert.equal(row.link,'7sefun:movie:25:via');
  const [s]=await ctx.search({keyword:'名 / A',page:2});assert.equal(s.title,'片名');assert.equal(s.durationText,'更新至2集');assert.equal(calls.length,2);assert.ok(calls.every(([u,o])=>u.startsWith(proxy)&&o.allow_redirects===false));
});
test('episode identity follows the label across reordered lines; parser content is not executed',async()=>{
  const u=site+'/voddetail/25.html', a='https://www.lmm22.com/play/12_1_2.html',b='ali_abc',mediaA='https://cdn.example/2a.mp4?token=t',mediaB='https://cdn.example/2b.mp4';
  const cipher=createCipheriv('aes-128-cbc','2890abcdef'+'tB959C','2F131BE91247866E');const payload=cipher.update(mediaA,'utf8','base64')+cipher.final('base64');
  const routes={[u]:detail,[site+'/vodplay/25-1-2.html']:play(1,2,'lmm',a),[site+'/vodplay/25-2-3.html']:play(2,3,'ndx',b),
    ['https://dp.no3acg.com/player/ec.php?code=qw&if=1&from=lmm&url='+encodeURIComponent(a)]:`ConFig=${JSON.stringify({code:200,url:payload,config:{uid:'abcdef'}})},box={}`,
    [site+'/addons/dp/player/index.php?key=0&id=25&uid=0&from=ndx&url=ali_abc']:`location.href="/addons/dp/player/art.php?ticket=x";`,[site+'/addons/dp/player/art.php?ticket=x']:`var config={"url":"${mediaB}", "ignored":(function(){throw Error()})()};`};
  const {ctx,calls,store}=runtime(Object.fromEntries(Object.entries(routes).map(([k,v])=>[proxy+k,v])));store.set('7sefun.proxy',proxy);const d=await ctx.loadDetail('7sefun:tv:25:via');
  assert.deepEqual(Array.from(d.episodeItems,e=>e.title),['第01集','第02集','SP']);assert.equal(d.description,'简介');assert.equal(d.title,'片名');assert.equal(d.posterPath,proxy+'https://images.example/p.jpg');
  const resources=await ctx.loadResource({link:d.episodeItems[1].link});assert.deepEqual(Array.from(resources,s=>[s.name,s.url]),[['A线',proxy+mediaA],['B线',proxy+mediaB]]);assert.ok(calls.every(([u])=>u.startsWith(proxy)));
});
test('foreign IDs, missing proxy and failed relay never trigger direct fallback; direct is explicitly supported',async()=>{
  const url=site+'/vodshow/1--time------1---.html';const {ctx,calls}=runtime({[url]:cards,[proxy+url]:{status:302,data:'redirect'}});
  assert.equal(await ctx.loadDetail('https://elsewhere.example/25'),null);assert.equal((await ctx.loadResource({link:'other:25',id:'7sefun:tv:25'})).length,0);
  await assert.rejects(ctx.loadDetail('7sefun:tv:25:via'),/反代/);await assert.rejects(ctx.loadList({proxy:'bad'}),/反代/);assert.equal(calls.length,0);
  await assert.rejects(ctx.loadList({proxy}),/302/);assert.equal(calls.length,1);const [r]=await ctx.loadList({proxy:''});assert.equal(r.posterPath,'https://images.example/p.jpg');assert.equal(r.link,'7sefun:tv:25');
});
test('HLS checks nested media, captions, keys and map references without fetching an unproxied URI',async()=>{
  const h='https://cdn.example/v/master.m3u8',entry=proxy+h,sub=proxy+'https://cdn.example/v/low.m3u8',cap=proxy+'https://sub.example/c.m3u8';
  const master=`#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,URI="${cap}"\n#EXT-X-STREAM-INF:BANDWIDTH=100\nlow.m3u8`;
  const vod='#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:4,\ns.ts\n#EXT-X-ENDLIST';
  const {ctx,calls}=runtime({[entry]:master,[sub]:vod,[cap]:'#EXTM3U\n#EXTINF:4,\ncc.vtt\n#EXT-X-ENDLIST'});await ctx.checkHLS(proxy,entry);assert.equal(calls.length,3);assert.ok(calls.every(([u])=>u.startsWith(proxy)));
  for(const bad of [vod.replace('s.ts','https://other.example/s.ts'),vod.replace('key.bin','//key.example/k'),vod.replace('init.mp4','/init.mp4'),vod.replace('#EXT-X-ENDLIST','')]){
    const x=runtime({[entry]:master,[sub]:bad,[cap]:vod});await assert.rejects(x.ctx.checkHLS(proxy,entry),/HLS|中转|点播/);assert.ok(x.calls.every(([u])=>u.startsWith(proxy)));
  }
});
test('unsafe HLS is not returned to Rex; a failed line cannot cause a direct retry',async()=>{
  const u=site+'/voddetail/25.html',base=site+'/vodplay/25-',h='https://videos.example/v.m3u8',mp4='https://videos.example/other.mp4';
  const routes={[proxy+u]:detail,[proxy+base+'1-2.html']:play(1,2,'videojs',h,0),[proxy+base+'2-3.html']:play(2,3,'videojs',mp4,0),[proxy+h]:'#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:4,\nhttps://origin.example/segment.ts\n#EXT-X-ENDLIST'};
  const {ctx,calls,store}=runtime(routes);store.set('7sefun.proxy',proxy);const link='7sefun:tv:25:1:2:via';
  const result=await ctx.loadResource({link});assert.deepEqual(Array.from(result,r=>r.url),[proxy+mp4]);
  routes[proxy+base+'2-3.html']={status:502,data:''};await assert.rejects(ctx.loadResource({link}),/未中转/);
  assert.ok(calls.every(([u,o])=>u.startsWith(proxy)&&!o.allow_redirects));
});
test('movie details and selected season episodes do not silently use another episode path',async()=>{
  const url=site+'/voddetail/25.html',v='https://videos.example/movie.mp4', movie=detail.slice(0,detail.indexOf('<div class="chat-header">'))+group('正片',1,[[1,'HD高清']]);
  const {ctx,calls}=runtime({[url]:movie,[site+'/vodplay/25-1-1.html']:play(1,1,'videojs',v,0)});
  assert.equal((await ctx.loadResource({link:'7sefun:movie:25',episode:1}))[0].url,v);
  const n=calls.length;assert.equal((await ctx.loadResource({link:'7sefun:tv:25:2:9'})).length,0);assert.equal(calls.length,n+1);
});
