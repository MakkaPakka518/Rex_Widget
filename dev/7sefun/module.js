// 七色番 · Rex。站点页面约定参考 Yswag/xptv-extensions 的 js/7sefun.js。
WidgetMetadata = {
  id: 'makkapakka.7sefun', title: '七色番', author: 'MakkaPakka518', version: '1.0.0', requiredVersion: '0.0.1',
  description: '番剧分类、搜索、选集与多线路播放，可设置全站前缀反代。', site:'https://www.7sefun.top', detailCacheDuration:0,
  globalParams:[{name:'proxy',title:'反代根地址（可选）',type:'input',value:'',description:'填写后使用「反代根地址/完整目标网址」，不回退直连。反代须中转重定向并支持 Range。'}],
  modules:[{id:'catalog',title:'分类片库',functionName:'loadList',cacheDuration:0,params:[
    {name:'category',title:'分类',type:'enumeration',value:'1',enumOptions:[{title:'TV番剧',value:'1'},{title:'国漫',value:'5'},{title:'剧场电影',value:'2'},{title:'特摄剧',value:'4'}]},
    {name:'order',title:'排序',type:'enumeration',value:'time',enumOptions:[{title:'更新时间',value:'time'},{title:'人气',value:'hits'},{title:'评分',value:'score'}]},
    {name:'area',title:'地区',type:'input',value:''},{name:'genre',title:'类型',type:'input',value:''},
    {name:'lang',title:'语言',type:'input',value:''},{name:'letter',title:'首字母',type:'input',value:''},{name:'year',title:'年份',type:'input',value:''},
    {name:'page',title:'页码',type:'page'}]},
    {id:'loadResource',title:'七色番播放线路',functionName:'loadResource',type:'stream',cacheDuration:0,params:[]}],
  search:{title:'搜索七色番',functionName:'search',params:[{name:'keyword',title:'关键词',type:'input'},{name:'page',title:'页码',type:'page'}]}
};

const SITE='https://www.7sefun.top', UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';
const PROXY_KEY='7sefun.proxy';
const IMAGE_HEADERS={'User-Agent':UA,Referer:SITE+'/'};
function clean(s){return String(s==null?'':s).trim();}
function positive(x){return /^[1-9]\d*$/.test(String(x));}
function http(s){return /^https?:\/\/[a-z\d.-]+(?::\d+)?(?:[/?#][^\s\\]*)?$/i.test(s);}
function prefix(value){
  const p=clean(value).replace(/\/+$/,'');
  if(!p && !clean(value))return '';
  if(!/^https?:\/\/[a-z\d.-]+(?::\d+)?(?:\/[\w.~-]+)*$/i.test(p)||/(?:^|\/)\.{1,2}(?:\/|$)/.test(p))throw Error('请填写有效的反代根地址，不要包含查询参数');
  return p+'/';
}
async function setting(params, required){
  if(params && params.proxy!=null){const p=prefix(params.proxy);if(required&&!p)throw Error('该条目使用反代，请刷新片库');await Widget.storage.set(PROXY_KEY,p);return p;}
  const p=prefix(await Widget.storage.get(PROXY_KEY));
  if(required&&!p)throw Error('反代配置缺失，请刷新片库；已停止请求');
  return p;
}
function via(p,u){if(!http(u))throw Error('无效的资源地址');return !p||u.startsWith(p)?u:p+u;}
function image(p,u){u=clean(u);if(u.startsWith('//'))u='https:'+u;else if(u.startsWith('/'))u=SITE+u;return http(u)?via(p,u):'';}
async function get(p,u,referer){
  const address=via(p,u);
  const r=await Widget.http.get(address,{allow_redirects:!p,headers:{'User-Agent':UA,Referer:referer||SITE+'/'}});
  const status=Number(r.statusCode||r.status||200);
  if(status<200||status>=300)throw Error('站点或反代返回 HTTP '+status);
  if(p&&http(r.url)&&!r.url.startsWith(p))throw Error('请求离开了反代地址');
  if(typeof r.data!=='string')throw Error('站点未返回文本');
  return r.data;
}
function key(kind,id,sid,nid,p){return `7sefun:${kind}:${id}`+(sid?`:${sid}:${nid}`:'')+(p?':via':'');}
function owned(s){const m=/^7sefun:(tv|movie|item):([1-9]\d*)(?::([1-9]\d*):([1-9]\d*))?(:via)?$/.exec(String(s||''));return m&&{kind:m[1],id:m[2],sid:m[3],nid:m[4],proxy:!!m[5]};}
function cards(p,html,kind){
  const $=Widget.html.load(html),out=[],seen=new Set();
  if(!$('.videos').length && !/搜索结果|暂无|没有找到/.test($('title,.main-header').text()))throw Error('没有识别到七色番片库页面');
  $('.videos .video').each((_,el)=>{const n=$(el), m=/^\/voddetail\/([1-9]\d*)\.html$/.exec(n.find('a.video-wrapper').attr('href')||'');
    const img=n.find('img.videoimg'),title=clean(n.find('.video-name').text())||clean(img.attr('alt'))||clean(n.find('.video-by').text());
    if(!m||!title||seen.has(m[1]))return;seen.add(m[1]);const link=key(kind,m[1],null,null,p);
    const durationText=clean(n.find('.video-view').text())||clean(n.find('.video-time:not(.video-time-score)').text());
    out.push({id:link,link,type:'url',title,...(kind==='item'?{}:{mediaType:kind}),posterPath:image(p,img.attr('src')||img.attr('data-original')),headers:IMAGE_HEADERS,durationText});
  });return out;
}
async function loadList(params={}){
  const p=await setting(params),c=String(params.category||'1');if(!['1','2','4','5'].includes(c))return [];
  const fields=[c,params.area,['time','hits','score'].includes(params.order)?params.order:'time',params.genre,params.lang,params.letter,'','',positive(params.page)?params.page:1,'','',params.year];
  return cards(p,await get(p,SITE+'/vodshow/'+fields.map(v=>encodeURIComponent(clean(v))).join('-')+'.html'),c==='2'?'movie':'tv');
}
async function search(params={}){const p=await setting(params),q=clean(params.keyword);if(!q)return [];return cards(p,await get(p,SITE+'/vodsearch/'+encodeURIComponent(q)+'----------'+(positive(params.page)?params.page:1)+'---.html'),'item');}
function episodeNumber(s){const m=/^(?:第\s*)?(\d+)\s*(?:集|话|話|回)?$/.exec(s);return m?Number(m[1]):null;}
async function show(k,p){
  const $=Widget.html.load(await get(p,SITE+'/voddetail/'+k.id+'.html'));
  const title=clean($('.video-p-name').first().text().split('热度：')[0])||clean(($('title').text().match(/《([^》]+)》/)||[])[1]);
  if(!title)throw Error('没有识别到七色番详情页');
  const groups=new Map(),info={};
  $('.video-p-sub1').each((_,el)=>{const m=/^([^：:]+)[：:]\s*([\s\S]+)$/.exec(clean($(el).text()));if(m&&clean(m[2])!=='未知')info[m[1]]=clean(m[2]);});
  $('.vod-play-list-container').each((i,el)=>{const n=$(el),line=clean(n.prev().find('.chat-stream-bfq').text())||'线路'+(i+1);
    n.find('a[href]').each((_,a)=>{const path=$(a).attr('href'),m=/^\/vodplay\/([1-9]\d*)-([1-9]\d*)-([1-9]\d*)\.html$/.exec(path),label=clean($(a).text())||clean($(a).attr('title'));if(!m||m[1]!==k.id||!label)return;
      const number=episodeNumber(label),tag=number==null?'label:'+label:'ep:'+number;
      if(!groups.has(tag))groups.set(tag,{label,number,tracks:[]});const tracks=groups.get(tag).tracks;
      if(!tracks.some(t=>t.path===path))tracks.push({sid:m[2],nid:m[3],path,line});
    });});
  const episodes=Array.from(groups.values());const mediaType=k.kind!=='item'?k.kind:episodes.some(e=>e.number!=null&&/集|话|話|回/.test(e.label))?'tv':episodes.length===1&&/正片|高清|剧场版/.test(title+' '+episodes[0].label)?'movie':null;
  const summary=$('.video-p-subtitle').first();summary.find('script,style').remove();
  const link=key(k.kind,k.id,null,null,p),posterPath=image(p,$('.video-author img.author-img').attr('src'));
  const item={id:link,link,type:'url',title,posterPath,headers:IMAGE_HEADERS,description:clean(summary.text()),...(mediaType?{mediaType}:{}),genreTitle:info['类型']||'',releaseDate:info['上映时间']||''};
  item.episodeItems=episodes.map(ep=>{const t=ep.tracks[0],l=key(k.kind,k.id,t.sid,t.nid,p);return {id:l,link:l,type:'url',title:ep.label,posterPath,headers:IMAGE_HEADERS,...(mediaType?{mediaType}:{}),...(ep.number!=null?{episode:ep.number}:{})};});
  return {item,episodes};
}
function selected(k,params,series){
  if(k.sid)return series.episodes.find(e=>e.tracks.some(t=>t.sid===k.sid&&t.nid===k.nid));
  if(series.item.mediaType==='movie'&&series.episodes.length===1)return series.episodes[0];
  if(params.episode!=null && clean(params.episode)!==''){return series.episodes.find(e=>e.number!=null&&String(e.number)===String(params.episode));}
  if(clean(params.episodeName))return series.episodes.find(e=>e.label===clean(params.episodeName));
  return series.episodes.length===1?series.episodes[0]:null;
}
async function loadDetail(link){const k=owned(link);if(!k)return null;const p=await setting(null,k.proxy),series=await show(k,p);if(!k.sid)return series.item;
  const ep=selected(k,{},series);return ep?series.item.episodeItems[series.episodes.indexOf(ep)]:null;
}

function bytes64(s){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';if(!/^[A-Za-z\d+/]+={0,2}$/.test(s))throw Error('播放器编码无效');const out=[];let bits=0,v=0;for(const ch of s){if(ch==='=')break;v=(v<<6)|chars.indexOf(ch);bits+=6;if(bits>=8){bits-=8;out.push((v>>bits)&255);}}return Uint8Array.from(out);}
function utf8(bytes){return decodeURIComponent(Array.from(bytes,b=>'%'+b.toString(16).padStart(2,'0')).join(''));}
function unwrap(s){return String(s).replace(/%u([0-9a-f]{4})|%([0-9a-f]{2})/gi,(_,wide,byte)=>String.fromCharCode(parseInt(wide||byte,16)));}
function media(u){return http(u)&&/\.(?:mp4|m3u8|flv|mkv|webm|m4v)$/i.test(u.split(/[?#]/)[0]);}
function jsField(text){const m=/(?:["']url["']|\burl)\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/.exec(text);if(!m)return '';return m[1][0]==='"'?JSON.parse(m[1]):m[1].slice(1,-1).replace(/\\\//g,'/');}
async function resolveTrack(k,t,p){
  const page=SITE+t.path, html=await get(p,page,SITE+'/voddetail/'+k.id+'.html');
  const $=Widget.html.load(html),script=$('script').toArray().map(e=>$(e).html()||'').find(s=>/^\s*var\s+player_aaaa\s*=/.test(s));if(!script)return '';
  const c=JSON.parse(script.replace(/^\s*var\s+player_aaaa\s*=\s*/,'').replace(/;?\s*$/,''));
  if(String(c.id)!==k.id||String(c.sid)!==t.sid||String(c.nid)!==t.nid||Number(c.points)>0)return '';
  const u=String(c.encrypt)==='2'?unwrap(utf8(bytes64(c.url))):String(c.encrypt)==='1'?unwrap(c.url):c.url;
  if(media(u))return u;
  if(c.from==='lmm'){
    if(!/^https?:\/\/www\.lmm\d+\.com\/play\/[\w-]+\.html$/.test(u))return '';
    const h=await get(p,'https://dp.no3acg.com/player/ec.php?code=qw&if=1&from=lmm&url='+encodeURIComponent(u),page);
    const m=/\bConFig\s*=\s*(\{[\s\S]*?\})\s*,\s*box/.exec(h);if(!m)return '';const v=JSON.parse(m[1]);if(Number(v.code)!==200||!v.config)return '';
    const ascii=s=>Uint8Array.from(s,ch=>ch.charCodeAt(0));const result=utf8(SevenAES.cbc(ascii('2890'+v.config.uid+'tB959C'),ascii('2F131BE91247866E')).decrypt(bytes64(v.url)));return media(result)?result:'';
  }
  if(!/^[a-z0-9_]+$/i.test(c.from))return '';
  const wrapper=SITE+'/addons/dp/player/index.php?key=0&id='+k.id+'&uid=0&from='+c.from+'&url='+encodeURIComponent(u);
  const h=await get(p,wrapper,page),m=/(?:location\.)?href\s*=\s*["'](\/addons\/dp\/player\/(?:dp|art)\.php\?[^"'<>]+)["']\s*;/.exec(h);
  if(!m)return '';const inner=await get(p,SITE+m[1].replace(/&amp;/g,'&'),wrapper);
  const config=/\b(?:var\s+)?config\s*=\s*\{([\s\S]*?)\}\s*(?:;|if\s*\()/.exec(inner),url=config?jsField(config[1]):'';return media(url)?url:'';
}

// 原生播放器会自行请求子清单和分片；仅代理入口不足以阻止这些请求直连。
function childURL(base,ref){
  if(!ref||/[\s\\{}]/.test(ref))throw Error('不支持动态或非法 HLS 引用');
  if(http(ref))return ref;if(ref.startsWith('//'))return base.split(':')[0]+':'+ref;
  if(/^[\w+.-]+:/.test(ref))throw Error('不支持该 HLS URI');
  const origin=base.match(/^https?:\/\/[^/]+/i)[0],path=ref.split(/[?#]/)[0];
  if(!path)return base.split(/[?#]/)[0]+ref;
  const parts=path.startsWith('/')?['']:base.slice(origin.length).split(/[?#]/)[0].split('/').slice(0,-1);
  for(const part of (path.startsWith('/')?path.slice(1):path).split('/')){const dot=part.replace(/%2e/ig,'.');if(dot==='.')continue;if(dot==='..'){if(parts.length>1)parts.pop();}else parts.push(part);}
  return origin+parts.join('/')+ref.slice(path.length);
}
async function checkHLS(proxy,entry,seen=new Set()){
  if(seen.has(entry))return;if(seen.size>=32)throw Error('HLS 子清单过多');seen.add(entry);
  const text=await get(proxy,entry);if(!/^\s*#EXTM3U\b/.test(text))throw Error('反代未返回 HLS 清单');
  let nextList=false,master=false,end=false;const children=new Set();
  function check(ref,list){const resolved=childURL(entry,ref);if(!resolved.startsWith(proxy)||!http(resolved.slice(proxy.length)))throw Error('HLS 含未中转的地址：请启用反代的播放列表重写');if(list)children.add(resolved);}
  for(const raw of text.split(/\r?\n/)){const l=raw.trim();if(!l)continue;
    if(!l.startsWith('#')){check(l,nextList||/\.m3u8(?:[?#]|$)/i.test(l));nextList=false;continue;}
    if(/^#EXT-X-STREAM-INF:/.test(l)){master=true;nextList=true;}
    if(l==='#EXT-X-ENDLIST')end=true;
    if(l.startsWith('#EXT-X-')){
      const tag=l.split(':')[0].slice(7);
      if(!/^(?:VERSION|INDEPENDENT-SEGMENTS|START|STREAM-INF|MEDIA|I-FRAME-STREAM-INF|IMAGE-STREAM-INF|SESSION-KEY|KEY|MAP|TARGETDURATION|MEDIA-SEQUENCE|DISCONTINUITY-SEQUENCE|DISCONTINUITY|ENDLIST|PLAYLIST-TYPE|I-FRAMES-ONLY|PROGRAM-DATE-TIME|GAP|BITRATE|BYTERANGE)$/.test(tag))throw Error('反代模式不接受未验证的 HLS 标签：'+tag);
      const uris=/(?:[:,])\s*URI\s*=\s*"([^"]+)"/gi;let m;
      while((m=uris.exec(l)))check(m[1],/^(?:MEDIA|I-FRAME-STREAM-INF|IMAGE-STREAM-INF)$/.test(tag));
      if(/[:,]\s*[\w-]*URI\s*=/i.test(l.replace(uris,'')))throw Error('不支持该 HLS URI 格式');
    }else if(/^#EXT/i.test(l)&&!/^#(?:EXTM3U$|EXTINF:)/.test(l))throw Error('不支持该 HLS 扩展');
  }
  if(!master&&!end)throw Error('反代模式下仅支持可预检的点播清单');for(const sub of children)await checkHLS(proxy,sub,seen);
}
async function loadResource(params={}){
  const k=owned(params.link!=null?params.link:params.id);if(!k)return [];
  const p=await setting(params,k.proxy),series=await show(k,p),ep=selected(k,params,series);if(!ep)return [];
  const results=await Promise.all(ep.tracks.map(async t=>{try{const raw=await resolveTrack(k,t,p);if(!raw)return null;const url=via(p,raw);if(p&&/\.m3u8$/i.test(raw.split(/[?#]/)[0]))await checkHLS(p,url);
    return {name:t.line,description:ep.label,url,customHeaders:{'User-Agent':UA,Referer:SITE+t.path},playerType:'app'};
  }catch(error){return {error:clean(error.message)||'播放线路请求失败'};}}));
  const ok=results.filter(r=>r&&r.url);if(!ok.length){const err=results.find(r=>r&&r.error);if(err)throw Error(err.error);}return ok;
}
