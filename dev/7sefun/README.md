# 七色番 · Rex 模块

[安装用 JS 直链](https://raw.githubusercontent.com/MakkaPakka518/Rex_Widget/main/7sefun.js) · [源站](https://www.7sefun.top/)

在 Rex 的模块管理里通过 URL 添加上面的 JS。在「七色番」的全局参数里填写 **反代根地址**，保存后重新加载片库。输入框默认空白（直连），末尾斜杠可有可无。若之前用过直连，请刷新已打开的旧列表和详情，让 Rex 取得带反代前缀的新图片地址。

例如填写 `https://relay.example/`，原地址 `https://cdn.example/video.mp4?x=1` 就会变成 `https://relay.example/https://cdn.example/video.mp4?x=1`。输入的是前缀式 HTTP 反代，不是 SOCKS、系统代理、`?url=` 服务或单站镜像。实际地址只保存在本机模块设置中。

- **片库**：TV 番剧、国漫、剧场电影、特摄剧；支持翻页、时间／人气／评分排序，以及类型、地区、语言、首字母、年份过滤。
- **搜索与选集**：按站内名称搜索。详情显示简介和站点提供的集数；同一集的不同线路按集名合并，特别篇保留原名。起播时才解析，线路故障不会把另一集当作替代。
- **反代范围**：模块发出的页面请求、播放器解析请求，以及交给 Rex 的封面、分集图片和媒体 URL 均套用同一前缀。开启反代后模块不重试直连。已标记为反代的条目若丢失配置，会停止请求。
- **媒体请求头**：交给播放器的视频只带 `User-Agent`，不再附带站点 `Referer`。部分 CDN（如搜索出的动态漫画分集）会对带站点 Referer 的请求返回 404，去掉后可正常返回 206。图片仍保留站点 Referer 以兼容部分图床。
- **HLS**：反代模式下，模块通过反代检查静态点播主清单、子清单及分片、字幕、密钥和初始化段的 URI。普通相对路径可以直接使用；绝对 CDN 地址须由反代改写回其前缀。不满足条件的线路不返回给播放器。动态路由和无法预检的直播清单不走这个模式。

**只分流一个域名的前提**：反代必须自己向上游取文件、支持 Range，并在服务端处理重定向或将 `Location` 改回反代域名。图片、MP4 和分片最终由 Rex 原生加载，模块不能拦截原生播放器收到的后续 30x。只返回 CDN 跳转的「反代」不能保证全程中转。模块安装和更新由 Rex 处理；如也要经反代下载 JS，可在安装直链前加同一个前缀。

## 维护

站点结构与播放器协议参考 [Yswag/xptv-extensions 的七色番扩展](https://github.com/Yswag/xptv-extensions/blob/main/js/7sefun.js)。`module.js` 是 Rex 实现，仓库根目录的 `7sefun.js` 是可直接导入的单文件产物；A 线所需的 AES-CBC 来自 `@noble/ciphers`（MIT），无需在设备上下载库。模块不执行从站点抓到的 JavaScript。

在本目录运行：

```sh
npm ci
npm run build
npm test
node check-live.cjs
SEVEN_TEST_PROXY=https://relay.example/ node check-live.cjs
```

离线覆盖反代失败、异源 ID、分集顺序、A/B 线路、字符串／对象两种回调形态、`get/set` 与 `getItem/setItem` 两套存储 API、媒体头不含 Referer 以及 HLS 外链拒绝。在线测试只取少量响应字节验证封面与视频；HTTP 验证不等于 Rex 真机播放验收。
