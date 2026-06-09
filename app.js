const $=id=>document.getElementById(id);
const canvas=$('canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
let original=null, current=null, imageLoaded=false;
const controls=['exposure','skin','smooth','saturation','contrast','sharpen','denoise','warm'];
const labels={exposure:'exposureVal',skin:'skinVal',smooth:'smoothVal',saturation:'saturationVal',contrast:'contrastVal',sharpen:'sharpVal',denoise:'denoiseVal',warm:'warmVal'};
$('pickBtn').onclick=()=>$('fileInput').click();
$('cameraBtn').onclick=()=>$('cameraInput').click();
$('fileInput').onchange=e=>loadFile(e.target.files[0]);
$('cameraInput').onchange=e=>loadFile(e.target.files[0]);
controls.forEach(id=>$(id).addEventListener('input',()=>{updateLabels(); render();}));
$('resetBtn').onclick=()=>{controls.forEach(id=>$(id).value=0); updateLabels(); render();};
$('autoBtn').onclick=()=>applyPreset('portrait');
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
$('beforeBtn').addEventListener('touchstart',showOriginal,{passive:true});
$('beforeBtn').addEventListener('mousedown',showOriginal);
['touchend','mouseup','mouseleave'].forEach(ev=>$('beforeBtn').addEventListener(ev,render));
$('saveBtn').onclick=saveImage;
updateLabels();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});

function loadFile(file){ if(!file) return; const img=new Image(); img.onload=()=>{ const max=2200; let w=img.width,h=img.height; if(Math.max(w,h)>max){ const r=max/Math.max(w,h); w=Math.round(w*r); h=Math.round(h*r); } canvas.width=w; canvas.height=h; ctx.drawImage(img,0,0,w,h); original=ctx.getImageData(0,0,w,h); current=new ImageData(new Uint8ClampedArray(original.data),w,h); imageLoaded=true; canvas.style.display='block'; $('hint').style.display='none'; render(); }; img.src=URL.createObjectURL(file); }
function vals(){let v={};controls.forEach(id=>v[id]=Number($(id).value));return v}
function updateLabels(){controls.forEach(id=>$(labels[id]).textContent=$(id).value)}
function applyPreset(p){ const sets={portrait:{exposure:8,skin:32,smooth:28,saturation:12,contrast:8,sharpen:18,denoise:12,warm:6},fresh:{exposure:12,skin:42,smooth:20,saturation:8,contrast:4,sharpen:10,denoise:8,warm:4},vivid:{exposure:5,skin:12,smooth:8,saturation:34,contrast:18,sharpen:20,denoise:5,warm:8},clear:{exposure:4,skin:10,smooth:8,saturation:10,contrast:16,sharpen:45,denoise:18,warm:0}}[p]; Object.entries(sets).forEach(([k,v])=>$(k).value=v); updateLabels(); render(); }
function render(){ if(!imageLoaded) return; const v=vals(); const w=original.width,h=original.height; let src=new Uint8ClampedArray(original.data); if(v.denoise>0||v.smooth>0) src=blurBlend(src,w,h,(v.denoise+v.smooth*.55)/100); let out=new Uint8ClampedArray(src.length); const ex=v.exposure, ct=1+v.contrast/100, sat=1+v.saturation/100, warm=v.warm, skin=v.skin/100, smooth=v.smooth/100; for(let i=0;i<src.length;i+=4){let r=src[i],g=src[i+1],b=src[i+2]; const lum=.299*r+.587*g+.114*b; const isSkin=(r>70&&g>45&&b>30&&r>g&&g>=b*.75&&(r-b)>12); const shadowBoost=Math.max(0,150-lum)/150*skin*36; r+=ex+shadowBoost; g+=ex+shadowBoost; b+=ex+shadowBoost; if(isSkin){ const avg=(r+g+b)/3; r=r*(1-smooth*.28)+avg*smooth*.28+skin*10; g=g*(1-smooth*.22)+avg*smooth*.22+skin*8; b=b*(1-smooth*.18)+avg*smooth*.18+skin*3; } r+=(r-128)*(ct-1); g+=(g-128)*(ct-1); b+=(b-128)*(ct-1); const gray=.299*r+.587*g+.114*b; r=gray+(r-gray)*sat+warm*.55; g=gray+(g-gray)*sat+warm*.12; b=gray+(b-gray)*sat-warm*.45; out[i]=clamp(r); out[i+1]=clamp(g); out[i+2]=clamp(b); out[i+3]=src[i+3]; } if(v.sharpen>0) out=sharpen(out,w,h,v.sharpen/100); current=new ImageData(out,w,h); ctx.putImageData(current,0,0); }
function blurBlend(data,w,h,amt){ const out=new Uint8ClampedArray(data); const radius=1; for(let y=1;y<h-1;y++){for(let x=1;x<w-1;x++){const i=(y*w+x)*4; let r=0,g=0,b=0; for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++){const j=((y+yy)*w+x+xx)*4; r+=data[j];g+=data[j+1];b+=data[j+2];} out[i]=data[i]*(1-amt)+(r/9)*amt; out[i+1]=data[i+1]*(1-amt)+(g/9)*amt; out[i+2]=data[i+2]*(1-amt)+(b/9)*amt; }} return out; }
function sharpen(data,w,h,amt){ const out=new Uint8ClampedArray(data); for(let y=1;y<h-1;y++){for(let x=1;x<w-1;x++){const i=(y*w+x)*4; for(let c=0;c<3;c++){const val=data[i+c]*5-data[i-4+c]-data[i+4+c]-data[i-w*4+c]-data[i+w*4+c]; out[i+c]=clamp(data[i+c]*(1-amt)+val*amt);}}} return out; }
function showOriginal(){ if(imageLoaded) ctx.putImageData(original,0,0); }
function saveImage(){ if(!imageLoaded){alert('Anh hãy chọn ảnh trước.');return;} canvas.toBlob(blob=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='PhotoPro-AI.jpg'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); },'image/jpeg',0.95); }
function clamp(x){return Math.max(0,Math.min(255,Math.round(x)))}
