const $ = (id)=>document.getElementById(id);
const canvas=$('canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
const hint=$('hint');
let original=null, current=null, loadedName='photopro-ai';
let showingOriginal=false, fitMode=true;
const settings={
  exposure:0, shadows:0, highlights:0, contrast:0, saturation:0, warmth:0, tint:0,
  skinBright:0, smooth:0, denoise:0, clarity:0, sharpen:0, vignette:0
};
const controls=[
 ['Ánh sáng',[['exposure','Phơi sáng',-40,40],['shadows','Sáng vùng tối',0,60],['highlights','Giảm cháy sáng',0,60],['contrast','Tương phản',-40,50]]],
 ['Màu sắc',[['saturation','Màu sắc',-40,60],['warmth','Ấm màu',-40,40],['tint','Cân hồng/xanh',-30,30]]],
 ['Chân dung',[['skinBright','Sáng da',0,60],['smooth','Mịn da',0,75],['denoise','Khử nhiễu',0,75]]],
 ['Chi tiết',[['clarity','Trong ảnh',0,60],['sharpen','Làm nét',0,70],['vignette','Tối viền nghệ thuật',0,40]]]
];
const labels={};
function buildControls(){const root=$('controls');root.innerHTML='';controls.forEach(([title,items])=>{const h=document.createElement('div');h.className='groupTitle';h.textContent=title;root.appendChild(h);items.forEach(([key,name,min,max])=>{const wrap=document.createElement('div');wrap.className='control';wrap.innerHTML=`<div class="row"><span class="name">${name}</span><span class="val" id="${key}Val">0</span></div><input id="${key}" type="range" min="${min}" max="${max}" value="0">`;root.appendChild(wrap);labels[key]=$(`${key}Val`);$(key).addEventListener('input',e=>{settings[key]=+e.target.value;labels[key].textContent=e.target.value;render();});});});}
buildControls();
$('libraryBtn').onclick=()=>$('libraryInput').click();
$('cameraBtn').onclick=()=>$('cameraInput').click();
$('libraryInput').onchange=e=>loadFile(e.target.files[0]);
$('cameraInput').onchange=e=>loadFile(e.target.files[0]);
function loadFile(file){if(!file)return; loadedName=(file.name||'photopro-ai').replace(/\.[^.]+$/,''); const img=new Image(); img.onload=()=>{const max=2200; let w=img.naturalWidth,h=img.naturalHeight; const r=Math.min(1,max/Math.max(w,h)); w=Math.round(w*r);h=Math.round(h*r); const off=document.createElement('canvas'); off.width=w;off.height=h; off.getContext('2d').drawImage(img,0,0,w,h); original=off; canvas.width=w;canvas.height=h; canvas.style.display='block'; hint.style.display='none'; render();}; img.src=URL.createObjectURL(file);}
function reset(){Object.keys(settings).forEach(k=>{settings[k]=0; const el=$(k); if(el){el.value=0; labels[k].textContent='0';}}); render();}
$('resetBtn').onclick=reset;
$('autoBtn').onclick=()=>applyPreset('auto');
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
function setVals(obj){reset();Object.entries(obj).forEach(([k,v])=>{settings[k]=v; if($(k)){ $(k).value=v; labels[k].textContent=v;}});render();}
function applyPreset(p){const presets={
 auto:{exposure:8,shadows:20,highlights:18,contrast:10,saturation:12,warmth:5,skinBright:18,smooth:22,denoise:18,clarity:12,sharpen:18},
 portrait:{exposure:6,shadows:14,highlights:18,contrast:8,saturation:8,warmth:7,skinBright:25,smooth:35,denoise:24,clarity:8,sharpen:18},
 beauty:{exposure:10,shadows:16,highlights:22,contrast:5,saturation:5,warmth:8,skinBright:38,smooth:48,denoise:32,clarity:2,sharpen:8},
 color:{exposure:4,shadows:12,highlights:12,contrast:18,saturation:35,warmth:5,tint:2,clarity:18,sharpen:16},
 clear:{exposure:2,shadows:18,highlights:10,contrast:16,saturation:10,clarity:35,sharpen:45,denoise:15},
 soft:{exposure:5,highlights:20,contrast:-2,saturation:6,warmth:8,skinBright:18,smooth:55,denoise:40,sharpen:4}
}; setVals(presets[p]||presets.auto);}
function render(){if(!original)return; ctx.drawImage(original,0,0,canvas.width,canvas.height); if(showingOriginal)return; let img=ctx.getImageData(0,0,canvas.width,canvas.height); let d=img.data,w=canvas.width,h=canvas.height;
 const exp=settings.exposure*2.2, con=1+settings.contrast/100, sat=1+settings.saturation/100, warm=settings.warmth*1.15, tint=settings.tint*1.1;
 const shadow=settings.shadows/100, high=settings.highlights/100, skin=settings.skinBright/100;
 for(let i=0;i<d.length;i+=4){let r=d[i],g=d[i+1],b=d[i+2]; let lum=.2126*r+.7152*g+.0722*b; if(shadow>0 && lum<150){let f=(150-lum)/150*shadow*55; r+=f;g+=f;b+=f;} if(high>0 && lum>170){let f=(lum-170)/85*high*55; r-=f;g-=f;b-=f;} r+=exp;g+=exp;b+=exp; r=(r-128)*con+128;g=(g-128)*con+128;b=(b-128)*con+128; const gray=.299*r+.587*g+.114*b; r=gray+(r-gray)*sat;g=gray+(g-gray)*sat;b=gray+(b-gray)*sat; r+=warm; b-=warm; r+=tint; g-=tint*.4; b+=tint*.7; const isSkin=r>65&&g>40&&b>25&&r>g&&g>b&&(r-g)>8&&(r-b)>18; if(isSkin&&skin>0){r+=38*skin;g+=25*skin;b+=16*skin; const avg=(r+g+b)/3; r=r*.94+avg*.06;g=g*.94+avg*.06;b=b*.94+avg*.06;} d[i]=clamp(r);d[i+1]=clamp(g);d[i+2]=clamp(b);} ctx.putImageData(img,0,0);
 if(settings.smooth||settings.denoise) softPass(settings.smooth, settings.denoise);
 if(settings.clarity) clarityPass(settings.clarity);
 if(settings.sharpen) sharpenPass(settings.sharpen);
 if(settings.vignette) vignette(settings.vignette);
}
function clamp(v){return Math.max(0,Math.min(255,v|0));}
function softPass(smooth,denoise){const strength=(smooth*.45+denoise*.35)/100; if(strength<=0)return; const base=ctx.getImageData(0,0,canvas.width,canvas.height); const blur=document.createElement('canvas');blur.width=canvas.width;blur.height=canvas.height; const bctx=blur.getContext('2d'); bctx.filter=`blur(${Math.min(5,1+strength*5)}px)`; bctx.drawImage(canvas,0,0); const bd=bctx.getImageData(0,0,canvas.width,canvas.height).data, d=base.data; for(let i=0;i<d.length;i+=4){let r=d[i],g=d[i+1],b=d[i+2]; const isSkin=r>65&&g>40&&b>25&&r>g&&g>b&&(r-g)>8&&(r-b)>18; const a=isSkin?strength:strength*.25; d[i]=r*(1-a)+bd[i]*a;d[i+1]=g*(1-a)+bd[i+1]*a;d[i+2]=b*(1-a)+bd[i+2]*a;} ctx.putImageData(base,0,0);}
function clarityPass(v){ctx.globalAlpha=Math.min(.35,v/160);ctx.globalCompositeOperation='overlay';ctx.filter='contrast(135%) saturate(110%)';ctx.drawImage(canvas,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';}
function sharpenPass(v){const a=Math.min(.7,v/100); const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);ctx.globalAlpha=a;ctx.filter='contrast(125%)';ctx.drawImage(copy,-1,0);ctx.drawImage(copy,1,0);ctx.drawImage(copy,0,-1);ctx.drawImage(copy,0,1);ctx.globalAlpha=1;ctx.filter='none';}
function vignette(v){const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,Math.min(canvas.width,canvas.height)*.2,canvas.width/2,canvas.height/2,Math.max(canvas.width,canvas.height)*.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${v/100})`);ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);}
$('beforeBtn').addEventListener('touchstart',()=>{showingOriginal=true;render();});$('beforeBtn').addEventListener('touchend',()=>{showingOriginal=false;render();});$('beforeBtn').addEventListener('mousedown',()=>{showingOriginal=true;render();});$('beforeBtn').addEventListener('mouseup',()=>{showingOriginal=false;render();});
$('fitBtn').onclick=()=>{fitMode=!fitMode; canvas.style.maxWidth=fitMode?'100%':'none'; $('fitBtn').textContent=fitMode?'Vừa màn hình':'Kích thước thật';};
function save(type='image/jpeg'){if(!original)return alert('Anh hãy chọn ảnh trước.'); render(); const a=document.createElement('a'); a.download=`${loadedName}_photopro_ai.${type.includes('png')?'png':'jpg'}`; a.href=canvas.toDataURL(type,type.includes('jpeg')?.95:1); a.click();}
$('saveBtn').onclick=()=>save('image/jpeg'); $('pngBtn').onclick=()=>save('image/png');
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
