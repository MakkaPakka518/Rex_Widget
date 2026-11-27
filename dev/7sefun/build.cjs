const fs = require('node:fs');
const path = require('node:path');
const {buildSync} = require('esbuild');
const aes = buildSync({stdin:{contents:'export {cbc} from "@noble/ciphers/aes";', resolveDir:__dirname}, bundle:true, write:false, platform:'browser', format:'iife', globalName:'SevenAES', target:'es2019', minify:true}).outputFiles[0].text;
const license = fs.readFileSync(path.join(__dirname,'node_modules/@noble/ciphers/LICENSE'),'utf8');
fs.writeFileSync(path.join(__dirname,'../../7sefun.js'),fs.readFileSync(path.join(__dirname,'module.js'),'utf8')+'\n/* Bundled @noble/ciphers 1.3.0\n'+license+'*/\n'+aes);
