const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const OPT=[['sound','Som'],['contrast','Alto contraste'],['big','Texto grande'],['calm','Reduzir movimento'],['assist','Mais tempo (+50%)'],['pad','Botões na tela']];
const opts=Object.assign({sound:true,contrast:false,big:false,calm:matchMedia('(prefers-reduced-motion: reduce)').matches,assist:false,pad:matchMedia('(pointer: coarse)').matches},store.get('lr_opts',{}));
const SPLASH=['Corra!','Sem pressa... só que não!','Cuidado com as serras!','Tic-tac!','Moedas!'];
$('#splash').textContent=SPLASH[Math.random()*SPLASH.length|0];

function applyOpts(){document.body.classList.toggle('hc',opts.contrast);document.body.classList.toggle('calm',opts.calm);
document.documentElement.style.fontSize=opts.big?'20px':'16px';$('#pad').classList.toggle('hidden',!opts.pad);store.set('lr_opts',opts)}
function renderOpts(){const l=$('#optList');l.innerHTML='';OPT.forEach(([k,n])=>{const b=document.createElement('button');b.className='btn';b.setAttribute('aria-pressed',opts[k]);
b.textContent=n+': '+(opts[k]?'Ligado':'Desligado');b.onclick=()=>{opts[k]=!opts[k];applyOpts();renderOpts();l.children[OPT.findIndex(o=>o[0]===k)].focus()};l.appendChild(b)})}
function renderScores(){const s=store.get('lr_scores',[]);$('#scoreList').innerHTML=s.length?s.map((r,i)=>`<p>${i+1}. ${r.s} pts - fase ${r.l}</p>`).join(''):'<p>Nenhum recorde ainda. Jogue uma partida!</p>'}
function saveScore(){const s=store.get('lr_scores',[]);s.push({s:G.score,l:G.level});s.sort((a,b)=>b.s-a.s);store.set('lr_scores',s.slice(0,5))}

const screens=['menu','how','opts','scores','game'];
function show(id){document.body.classList.toggle('mn',id!=='game');if(id!=='game')document.body.style.background='';screens.forEach(s=>$('#'+s).classList.toggle('hidden',s!==id));if(id==='opts')renderOpts();if(id==='scores')renderScores();
const b=$('#'+id+' .btn');if(b&&id!=='game')b.focus()}
function say(t){$('#live').textContent=t}

document.addEventListener('click',e=>{const a=e.target.dataset&&e.target.dataset.a;if(!a)return;
if(a==='play')startGame();else if(a==='back'){state='menu';show('menu')}else show(a)});
document.addEventListener('keydown',e=>{
 if(state==='menu'||state==='over'||state==='pause'||state==='ready'||state==='clear'){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){const sc=document.activeElement.closest('.screen,#ov');if(!sc)return;const bs=[...sc.querySelectorAll('.btn')],i=bs.indexOf(document.activeElement);
   bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus();e.preventDefault()}
  if((e.key==='p'||e.key==='P'||e.key==='Escape')&&state==='pause')resume();return}
 if(state==='play'){keys[e.key.toLowerCase()]=true;if(e.key==='p'||e.key==='P'||e.key==='Escape')pause();if(e.key.startsWith('Arrow'))e.preventDefault()}});
document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
const keys={};
document.querySelectorAll('.pad .btn').forEach(b=>{const k=b.dataset.k.toLowerCase();
 b.addEventListener('pointerdown',e=>{keys[k]=true;e.preventDefault()});
 ['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,()=>keys[k]=false));b.addEventListener('contextmenu',e=>e.preventDefault())});
$('#bP').onclick=()=>{if(state==='play')pause()};

/* som */
let ac;function beep(f,d=.09,ty='square',v=.04){if(!opts.sound)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.type=ty;o.frequency.value=f;g.gain.setValueAtTime(v,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+d);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch(e){}}

/* jogo */
const cv=$('#cv'),c=cv.getContext('2d'),T=32,HH=14,LEVELS=8,SPD=3.2,H=.26;
let state='menu',G,g,W,fl,p,items,sp,saws,exit,last=0,parts=[],TH_;
const TH=[
{a:'#2f6b4a',b:'#357a54',t:'#7be08a',f:'#3a9a58',bg:'#14532d',p:'#c77dff'},
{a:'#2a5a7a',b:'#2f6688',t:'#bdf2ff',f:'#5bb8dc',bg:'#0c4a6e',p:'#ff7ad9'},
{a:'#a0693a',b:'#ad7542',t:'#ffd48a',f:'#e0953f',bg:'#7c2d12',p:'#5cf2d6'},
{a:'#4a2530',b:'#552a37',t:'#ff9a6b',f:'#d9503a',bg:'#450a0a',p:'#8ee8ff'},
{a:'#3b2a6e',b:'#45327e',t:'#e0b8ff',f:'#9b5de5',bg:'#2e1065',p:'#ffe66d'},
{a:'#1c2a52',b:'#22335f',t:'#9db4ff',f:'#4a63c8',bg:'#0b1233',p:'#7dffb0'},
{a:'#1d3b3a',b:'#224644',t:'#8ff0e0',f:'#1fa89a',bg:'#053b3a',p:'#ff9f1c'},
{a:'#3a3a45',b:'#42424f',t:'#d0d4e0',f:'#7b8196',bg:'#1b1d2a',p:'#ff6b35'}];
const NAMES=['Floresta','Gelo','Deserto','Vulcão','Cristal','Noite','Abismo','Fábrica'];
const th=()=>opts.contrast?{a:'#000',b:'#000',t:'#fff',f:'#999',bg:'#000',p:'#0f0'}:TH[(G.level-1)%8];
const COL=()=>opts.contrast?{coin:'#ff0',heart:'#f0f',speed:'#0ff',clock:'#fff',key:'#ff0',sp:'#ff6a00'}:{coin:'#ffd23f',heart:'#ff4d6d',speed:'#3de6ff',clock:'#fff',key:'#ffd23f',sp:'#ff2e63'};

function genMaze(n){const S=2*n+1,m=Array.from({length:S},()=>Array(S).fill(1)),st=[[1,1]];m[1][1]=0;
 while(st.length){const[x,y]=st[st.length-1],d=[[2,0],[-2,0],[0,2],[0,-2]].filter(([a,b])=>{const X=x+a,Y=y+b;return X>0&&Y>0&&X<S-1&&Y<S-1&&m[Y][X]===1});
  if(!d.length){st.pop();continue}const[a,b]=d[Math.random()*d.length|0];m[y+b/2][x+a/2]=0;m[y+b][x+a]=0;st.push([x+a,y+b])}
 for(let k=0;k<n*2;k++){const x=1+(Math.random()*(S-2)|0),y=1+(Math.random()*(S-2)|0);if(m[y][x]===1&&((m[y][x-1]===0&&m[y][x+1]===0)!==(m[y-1][x]===0&&m[y+1][x]===0)))m[y][x]=0}
 return m}
function bfs(){const d=Array.from({length:W},()=>Array(W).fill(-1)),q=[[1,1]];d[1][1]=0;
 for(let i=0;i<q.length;i++){const[x,y]=q[i];[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{if(g[y+b][x+a]===0&&d[y+b][x+a]<0){d[y+b][x+a]=d[y][x]+1;q.push([x+a,y+b])}})}
 return d}

function startGame(){G={level:1,score:0,lives:3,coins:0};loadLevel()}
function loadLevel(){const n=5+G.level;g=genMaze(n);W=2*n+1;const d=bfs(),free=[];
 for(let y=1;y<W-1;y++)for(let x=1;x<W-1;x++)if(g[y][x]===0&&d[y][x]>3&&!(x===W-2&&y===W-2))free.push([x,y]);
 free.sort(()=>Math.random()-.5);
 const take=(t,k)=>Array.from({length:k},()=>{const[x,y]=free.pop();return{x,y,t}});
 sp=take('sp',2+G.level*2).map((l,i)=>({...l,o:i*.7}));
 saws=[];for(let i=0;i<Math.min(G.level+1,7);i++){const[x,y]=free.pop(),ds=[[1,0],[0,1],[-1,0],[0,-1]].filter(([a,b])=>g[y+b][x+a]===0),ok=ds.filter(([a,b])=>g[y-b][x-a]===0),q=(ok.length?ok:ds)[0];if(q)saws.push({x:x+.5,y:y+.5,dx:q[0],dy:q[1],v:1.6+G.level*.25})}
 items=[...take('coin',6+G.level),...take('speed',1+(G.level>3)),...take('clock',1)];if(G.level>1)items.push(...take('heart',1));if(G.level>=3)items.push(...take('key',1));
 exit={x:W-2,y:W-2};G.max=G.time=Math.ceil((d[W-2][W-2]/SPD*1.8+8)*(opts.assist?1.5:1));
 p={x:1.5,y:1.5,fx:0,fy:1,mv:0};parts=[];G.key=G.level<3;G.boost=0;G.inv=0;G.clock=0;G.shake=0;
 cv.width=W*T;cv.height=W*T+HH;buildStatic();hud();show('game');
 if(!opts.contrast)document.body.style.background=`radial-gradient(circle at 50% 25%,${th().bg},#090616 85%) fixed`;
 state='ready';
 overlay(`Fase ${G.level} de ${LEVELS}`,[NAMES[(G.level-1)%8],`Chegue ao portal em ${G.max} segundos.`,...(G.level>=3?['Pegue a chave para abrir o portal.']:[])],[['Começar',()=>{closeOv();state='play';last=performance.now();say('Fase '+G.level+'. Valendo!')}]])}

function buildStatic(){const Th=th();fl=document.createElement('canvas');fl.width=fl.height=W*T;const x=fl.getContext('2d');
 for(let j=0;j<W;j++)for(let i=0;i<W;i++){x.fillStyle=(i+j)%2?Th.a:Th.b;x.fillRect(i*T,j*T,T,T);
  if(g[j][i]===0&&j>0&&g[j-1][i]===1){const gr=x.createLinearGradient(0,j*T,0,j*T+12);gr.addColorStop(0,'#0007');gr.addColorStop(1,'#0000');x.fillStyle=gr;x.fillRect(i*T,j*T,T,12)}}}

function hit(x,y){const s=(a,b)=>g[Math.floor(b)][Math.floor(a)]===1;return s(x-H,y-H)||s(x+H,y-H)||s(x-H,y+H)||s(x+H,y+H)}
const ext=l=>{if(opts.calm)return 1;const q=(G.clock+l.o)%3;return q<1.8?Math.min(1,q*8):Math.max(0,1-(q-1.8)*8)};
function burst(x,y,col,n=9){if(opts.calm)return;for(let i=0;i<n;i++){const a=Math.random()*6.28,s=1+Math.random()*2;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,l:.5,c:col})}}
function hurt(why){G.lives--;G.inv=1.6;G.shake=.3;burst(p.x,p.y,'#ff2e63',12);beep(120,.25,'sawtooth',.07);say(why+' '+G.lives+' vidas')}

function update(dt){
 G.time-=dt;G.clock+=dt;G.boost=Math.max(0,G.boost-dt);G.inv=Math.max(0,G.inv-dt);G.shake=Math.max(0,G.shake-dt);
 let dx=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0),dy=(keys.arrowdown||keys.s?1:0)-(keys.arrowup||keys.w?1:0);
 if(dx&&dy){dx*=.7071;dy*=.7071}
 p.mv=dx||dy;if(p.mv){p.fx=dx;p.fy=dy}const v=(G.boost>0?5.6:SPD)*dt;let nx=p.x+dx*v;if(!hit(nx,p.y))p.x=nx;let ny=p.y+dy*v;if(!hit(p.x,ny))p.y=ny;
 items=items.filter(it=>{if(Math.abs(it.x+.5-p.x)>.55||Math.abs(it.y+.5-p.y)>.55)return true;
  if(it.t==='coin'){G.coins++;G.score+=10;beep(880,.08);burst(p.x,p.y,'#ffd23f');say('Moeda')}
  else if(it.t==='heart'){G.lives=Math.min(5,G.lives+1);beep(660,.15,'triangle');say('Vida extra. '+G.lives+' vidas')}
  else if(it.t==='speed'){G.boost=6;beep(1200,.15,'sawtooth');say('Velocidade aumentada')}
  else if(it.t==='key'){G.key=true;G.score+=50;beep(1000,.2,'triangle');burst(p.x,p.y,'#ffd23f');say('Chave coletada. Portal aberto')}
  else{G.time=Math.min(G.max,G.time+8);beep(500,.15,'triangle');say('Mais 8 segundos')}
  return false});
 saws.forEach(z=>{const nx=z.x+z.dx*z.v*dt,ny=z.y+z.dy*z.v*dt;if(g[Math.floor(ny+z.dy*.5)][Math.floor(nx+z.dx*.5)]===1){z.dx*=-1;z.dy*=-1}else{z.x=nx;z.y=ny}
  if(!G.inv&&Math.hypot(z.x-p.x,z.y-p.y)<.55)hurt('Serra!')});
 if(!G.inv&&sp.some(l=>l.x===Math.floor(p.x)&&l.y===Math.floor(p.y)&&ext(l)>.6))hurt('Espinhos!');
 parts.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.l-=dt});parts=parts.filter(q=>q.l>0);
 hud();
 if(G.lives<=0)return end('Sem vidas!');
 if(G.time<=0){G.time=0;hud();return end('O tempo acabou!')}
 if(Math.floor(p.x)===exit.x&&Math.floor(p.y)===exit.y&&G.key)clear()}

function hud(){$('#hL').textContent='♥'.repeat(G.lives);$('#hL').setAttribute('aria-label',G.lives+' vidas');
 $('#hLv').textContent='Fase '+G.level+'/'+LEVELS+(G.level>=3?(G.key?' · Portal aberto':' · Ache a chave'):'');$('#hC').textContent='Moedas '+G.coins;$('#hS').textContent=G.score+' pts'+(G.boost>0?' ⚡':'');
 const r=Math.max(0,G.time/G.max),f=$('#tf');f.style.width=r*100+'%';f.style.background=r>.5?(opts.contrast?'#0f0':'#5da13a'):r>.25?'#e0b020':'#d03030';
 $('#tt').textContent=Math.ceil(G.time)+'s';$('#tb').setAttribute('aria-valuenow',Math.ceil(G.time));$('#tb').setAttribute('aria-valuemax',G.max)}

function overlay(t,lines,btns){const o=$('#ov');o.innerHTML='';const h=document.createElement('h2');h.textContent=t;o.appendChild(h);
 lines.forEach(l=>{const q=document.createElement('p');q.textContent=l;o.appendChild(q)});
 btns.forEach(([n,f])=>{const b=document.createElement('button');b.className='btn';b.textContent=n;b.onclick=f;o.appendChild(b)});
 o.classList.remove('hidden');o.querySelector('.btn').focus()}
function closeOv(){$('#ov').classList.add('hidden')}
function pause(){state='pause';Object.keys(keys).forEach(k=>keys[k]=false);overlay('Pausado',['Respire fundo. O tempo parou.'],[['Continuar',resume],['Reiniciar fase',()=>{closeOv();loadLevel()}],['Menu principal',()=>{closeOv();state='menu';show('menu')}]])}
function resume(){closeOv();state='play';last=performance.now()}
function clear(){state='clear';const b=Math.floor(G.time)*5,lv=100*G.level;G.score+=b+lv;beep(784,.3,'triangle');hud();
 if(G.level>=LEVELS){saveScore();return overlay('Você venceu!',[`Pontuação final: ${G.score}`,`Moedas: ${G.coins}`],[['Jogar de novo',startGame],['Menu principal',()=>{closeOv();state='menu';show('menu')}]])}
 say('Fase concluída');overlay('Fase concluída!',[`Bônus de tempo: ${b}`,`Bônus de fase: ${lv}`,`Total: ${G.score} pts`],[['Próxima fase',()=>{G.level++;closeOv();loadLevel()}]])}
function end(why){state='over';beep(150,.5,'sawtooth',.07);saveScore();say(why);
 overlay(why,[`Pontuação: ${G.score}`,`Você chegou à fase ${G.level}.`],[['Tentar de novo',startGame],['Menu principal',()=>{closeOv();state='menu';show('menu')}]])}

function item(t,cx,cy,C){const q=G.clock;c.save();c.translate(cx,cy);
 c.fillStyle='#0004';c.beginPath();c.ellipse(0,11-cy%1,8,3,0,0,7);c.fill();
 c.fillStyle=C[t]+'33';c.beginPath();c.arc(0,-2,13,0,7);c.fill();
 if(t==='coin'){const w=opts.calm?1:Math.abs(Math.cos(q*3)),z=Math.max(.15,w);c.fillStyle='#c98a00';c.beginPath();c.ellipse(0,0,9*z+1.5,9,0,0,7);c.fill();c.fillStyle=C.coin;c.beginPath();c.ellipse(0,0,9*z,8,0,0,7);c.fill();c.fillStyle='#fff8';c.fillRect(-1,-4,2,8)}
 else if(t==='heart'){c.fillStyle=C.heart;c.beginPath();c.moveTo(0,9);c.bezierCurveTo(-14,-1,-8,-11,0,-4);c.bezierCurveTo(8,-11,14,-1,0,9);c.fill();c.fillStyle='#fff8';c.fillRect(-6,-5,3,3)}
 else if(t==='speed'){c.fillStyle=C.speed;c.beginPath();c.moveTo(3,-12);c.lineTo(-7,2);c.lineTo(-1,2);c.lineTo(-3,12);c.lineTo(7,-3);c.lineTo(1,-3);c.fill()}
 else if(t==='key'){c.strokeStyle=C.key;c.lineWidth=3;c.beginPath();c.arc(-4,-3,5,0,7);c.stroke();c.beginPath();c.moveTo(1,-3);c.lineTo(11,-3);c.moveTo(8,-3);c.lineTo(8,2);c.moveTo(11,-3);c.lineTo(11,1);c.stroke()}
 else{c.fillStyle='#fff';c.beginPath();c.arc(0,0,10,0,7);c.fill();c.strokeStyle='#3a3a6a';c.lineWidth=2.5;c.beginPath();c.moveTo(0,-6);c.lineTo(0,0);c.lineTo(5,3);c.stroke();c.strokeStyle=C.speed;c.beginPath();c.arc(0,0,10,0,7);c.stroke()}
 c.restore()}

function block(i,j,Th){const x=i*T,y=j*T;c.fillStyle=Th.f;c.fillRect(x,y+T-HH,T,HH);c.fillStyle='#0004';c.fillRect(x,y+T-3,T,3);
 c.fillStyle=Th.t;c.fillRect(x,y-HH,T,T);c.fillStyle='#ffffff40';c.fillRect(x,y-HH,T,2);c.fillRect(x,y-HH,2,T);
 c.fillStyle='#0000001c';c.fillRect(x+T-2,y-HH,2,T);c.fillRect(x+7,y-HH+7,T-14,T-14)}

function saw(z){c.save();c.translate(z.x*T,z.y*T);c.fillStyle='#0005';c.beginPath();c.ellipse(0,8,11,4,0,0,7);c.fill();c.translate(0,-4);c.rotate(opts.calm?0:G.clock*9);
 c.fillStyle='#cfd8e3';for(let i=0;i<8;i++){c.rotate(.7854);c.beginPath();c.moveTo(-4,-9);c.lineTo(0,-15);c.lineTo(4,-9);c.fill()}
 c.beginPath();c.arc(0,0,10,0,7);c.fill();c.strokeStyle='#8795a8';c.lineWidth=2;c.stroke();c.fillStyle='#ff2e63';c.beginPath();c.arc(0,0,4,0,7);c.fill();c.restore()}

function hero(){const x=p.x*T,y=p.y*T,t=G.clock,m=p.mv&&!opts.calm,b=m?Math.sin(t*16)*1.2:Math.sin(t*3)*.7,lg=m?Math.sin(t*16)*2.5:0,cw=opts.calm?0:Math.sin(t*9)*2.5;
 if(G.inv>0&&!opts.calm&&Math.floor(t*12)%2)return;
 c.save();c.globalAlpha=G.inv>0?.65:1;c.fillStyle='#0005';c.beginPath();c.ellipse(x,y+9,10,4,0,0,7);c.fill();
 if(G.boost>0){c.strokeStyle='#3de6ff';c.lineWidth=2;c.globalAlpha=.7;c.beginPath();c.arc(x,y-6,19+(opts.calm?0:Math.sin(t*10)*2),0,7);c.stroke();c.globalAlpha=1}
 c.translate(x,y+9);c.scale(.88,.88);
 const cape=()=>{const cx=-p.fx*6,cy=-p.fy*3;c.fillStyle='#d62839';c.beginPath();c.moveTo(-8,-19+b);c.lineTo(8,-19+b);c.lineTo(12+cx+cw,0+cy);c.lineTo(cx,4+cy+Math.abs(cw));c.lineTo(-12+cx-cw,0+cy);c.closePath();c.fill();c.fillStyle='#0003';c.fillRect(-1,-19+b,2,16)};
 if(p.fy>=0)cape();
 c.fillStyle='#1d4ed8';c.fillRect(-6,-9,5,9+lg);c.fillRect(1,-9,5,9-lg);c.fillStyle='#d62839';c.fillRect(-7,-3+lg,6,4);c.fillRect(1,-3-lg,6,4);
 c.fillStyle='#2563eb';c.fillRect(-9,-21+b,18,13);c.fillStyle='#1d4ed8';c.fillRect(-9,-21+b,18,3);
 c.fillStyle='#ffd23f';c.fillRect(-9,-10+b,18,2.5);c.fillRect(-1.5,-11+b,3,4);
 c.fillStyle='#ffd23f';c.beginPath();c.arc(0,-16+b,4.2,0,7);c.fill();c.fillStyle='#1d4ed8';c.beginPath();c.moveTo(1.5,-19+b);c.lineTo(-2,-15.5+b);c.lineTo(0,-15.5+b);c.lineTo(-1,-12.5+b);c.lineTo(2.5,-16.5+b);c.lineTo(.3,-16.5+b);c.fill();
 c.fillStyle='#2563eb';c.fillRect(-12.5,-20+b,4,9);c.fillRect(8.5,-20+b,4,9);c.fillStyle='#f1c27d';c.beginPath();c.arc(-10.5,-10.5+b,2.4,0,7);c.arc(10.5,-10.5+b,2.4,0,7);c.fill();
 c.fillStyle='#f1c27d';c.beginPath();c.arc(0,-27+b,7,0,7);c.fill();
 c.fillStyle='#0b1b4d';c.fillRect(-7,-30+b,14,5);c.beginPath();c.arc(0,-27+b,7,3.5,6);c.fill();
 const ex=p.fx*1.3;c.fillStyle='#fff';c.fillRect(-5+ex,-29+b,4,2.5);c.fillRect(1+ex,-29+b,4,2.5);
 c.fillStyle='#2b1b0e';c.fillRect(-4,-23+b,8,1.2);
 if(p.fy<0)cape();
 c.restore()}

function draw(){const Th=th(),C=COL(),t=G.clock;c.save();c.fillStyle=Th.bg;c.fillRect(0,0,cv.width,cv.height);c.translate(0,HH);
 if(G.shake>0&&!opts.calm)c.translate((Math.random()-.5)*6,(Math.random()-.5)*6);
 c.drawImage(fl,0,0);
 const ex=exit.x*T+T/2,ey=exit.y*T+T/2,pu=opts.calm?0:Math.sin(t*4);
 const pc=G.key?Th.p:'#667';c.fillStyle=pc+'44';c.beginPath();c.arc(ex,ey,17+pu*2,0,7);c.fill();c.fillStyle='#1a0b2e';c.fillRect(ex-12,ey-14,24,28);c.fillStyle=pc;c.globalAlpha=.8;c.fillRect(ex-8,ey-10,16,20);c.globalAlpha=1;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(ex,ey,5+pu*2,0,7);c.stroke();c.beginPath();c.arc(ex,ey,2,0,7);c.stroke();
 sp.forEach(l=>{const X=l.x*T,Y=l.y*T,e=ext(l);c.fillStyle='#0006';c.fillRect(X+3,Y+3,T-6,T-6);
  if(e<.05){c.strokeStyle=C.sp;c.globalAlpha=.5+.4*Math.sin(t*8);c.lineWidth=2;c.strokeRect(X+5,Y+5,T-10,T-10);c.globalAlpha=1}
  [[9,13],[23,13],[9,27],[23,27]].forEach(([a,b])=>{const h=e*13;c.fillStyle=C.sp;c.beginPath();c.moveTo(X+a-5,Y+b);c.lineTo(X+a+5,Y+b);c.lineTo(X+a,Y+b-h);c.fill();if(e>.5){c.fillStyle='#fff';c.fillRect(X+a-1,Y+b-h,2,2)}})});
 const en=[...items.map(i=>({y:i.y+.5,f:()=>item(i.t,i.x*T+T/2,i.y*T+T/2-4+(opts.calm?0:Math.sin(t*4+i.x)*2),C)})),...saws.map(z=>({y:z.y,f:()=>saw(z)})),{y:p.y,f:hero}].sort((a,b)=>a.y-b.y);
 let k=0;for(let j=0;j<W;j++){for(let i=0;i<W;i++)if(g[j][i]===1)block(i,j,Th);while(k<en.length&&en[k].y<j+1)en[k++].f()}
 while(k<en.length)en[k++].f();
 parts.forEach(q=>{c.fillStyle=q.c;c.globalAlpha=Math.min(1,q.l*2);c.fillRect(q.x*T,q.y*T-4,3,3)});
 c.restore()}

function frame(now){if(state==='play'){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt)}
 if(G&&(state==='play'||state==='ready'||state==='pause'||state==='clear'||state==='over'))draw();requestAnimationFrame(frame)}
applyOpts();requestAnimationFrame(frame);show('menu');
