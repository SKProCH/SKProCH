/* Outer Wilds camp scene after artwork by Mobius Digital. */
const W = 320, H = 180, N = W * H, S = W / 208;
const FX = 151, FY = 79, radius = Math.hypot(FX - 193, FY - 156);
const FS = (FX - 193) / radius, FC = (156 - FY) / radius;
const palette = ['071014','0b1b20','10272c','17333a','1b414b','225563','2b6c7c','368595','4a9caa','6fb7bf','a0d8dd','d6f0ed','10281b','183d23','245532','347544','4a995b','73b873','8c8658','b09b60','d5b96e','f6d58a','fff1b5','fff9db','4b392c','6d4930','986137','c7803d','ef9b43','ffbb54','ffdb67','ffef91','d95626','f3782f','ff9c35','ffc53f','142334','24384f','455477','7b8baa','b8cce5','edf5ff','344348','495557','63706b','849083'].map(s => [0,2,4].map(i => parseInt(s.slice(i,i+2),16)/255));
const clamp = v => Math.max(0, Math.min(1, v));
const smooth = (a,b,v) => { const k = clamp((v-a)/(b-a)); return k*k*(3-2*k); };
function hash(x,y) { let h = Math.imul(x|0,374761393)+Math.imul(y|0,668265263); h = Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296; }
function noise(x,y) { const ix=Math.floor(x),iy=Math.floor(y),u=smooth(0,1,x-ix),v=smooth(0,1,y-iy); const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
const INK=[.004,.014,.012], BARK=[.015,.038,.023];
const sr=new Float32Array(N),sg=new Float32Array(N),sb=new Float32Array(N);
const cr=new Float32Array(N),cg=new Float32Array(N),cb=new Float32Array(N);
const light=new Float32Array(N),fr=new Float32Array(N),fg=new Float32Array(N),fb=new Float32Array(N);
const solid=new Uint8Array(N),ground=new Float32Array(N),shadows=[];
for(let row=0;row<H;row++) for(let col=0;col<W;col++) {
    const k=row*W+col,x=(col+.5)/S,y=(row+.5)/S,g=hash(col*3,row*7);
    const edge=Math.hypot(x-193,y-156)-86+(noise(x*.19,y*.19)-.5)*.6;
    const air=Math.exp(-((Math.max(0,edge)/10)**2))*.20+Math.exp(-((edge/2.8)**2))*.58;
    const mist=.85+.15*noise(x*.19,y*.19),distance=Math.hypot(x-FX,y-FY);
    const warm=Math.exp(-((distance/14)**2)),pool=Math.exp(-((distance/31)**2))*(1-smooth(42,65,distance));
    const haze=Math.exp(-((distance/18)**2)),rim=Math.exp(-((edge/4)**2))*pool,tint=Math.min(.94,haze*.78+rim*.85);
    sr[k]=air*.15*mist*(1-tint);sg[k]=air*.76*mist*(1-tint);sb[k]=air*.85*mist*(1-tint);
    fr[k]=haze*.49+rim*(.18+warm*.32);fg[k]=haze*.26+rim*(.34+warm*.06);fb[k]=haze*.045+rim*.085;
    sr[k]+=fr[k];sg[k]+=fg[k];sb[k]+=fb[k];
    if(edge<=0) {
        solid[k]=1;ground[k]=1;
        const texture=.65+.25*noise(x*.32,y*.32)+.2*g,rr=sr[k],rg=sg[k],rb=sb[k],rf=fr[k],gf=fg[k],bf=fb[k],lip=Math.exp(edge/12);
        fr[k]=pool*(.12+warm*.62)*texture;fg[k]=pool*(.50+warm*.22)*texture;fb[k]=pool*(.15-warm*.05)*texture;
        sr[k]=(.008+lip*.018)*texture+fr[k];sg[k]=(.025+lip*.052)*texture+fg[k];sb[k]=(.009+lip*.023)*texture+fb[k];
        const a=Math.exp(edge/1.8)*.7;
        sr[k]+=(rr-sr[k])*a;sg[k]+=(rg-sg[k])*a;sb[k]+=(rb-sb[k])*a;
        fr[k]+=(rf-fr[k])*a;fg[k]+=(gf-fg[k])*a;fb[k]+=(bf-fb[k])*a;
    }
}
function paint(k,rgb,a,lit) {
    sr[k]+=(rgb[0]-sr[k])*a;sg[k]+=(rgb[1]-sg[k])*a;sb[k]+=(rgb[2]-sb[k])*a;
    light[k]=light[k]*(1-a)+lit*a;fr[k]*=1-a;fg[k]*=1-a;fb[k]*=1-a;
    if(a>.45) solid[k]=1;ground[k]*=1-a;
}
function line(ax,ay,bx,by,width,rgb,lit=0) {
    ax*=S;ay*=S;bx*=S;by*=S;width*=S;
    const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
    for(let y=Math.max(0,Math.floor(Math.min(ay,by)-width-1));y<=Math.min(H-1,Math.ceil(Math.max(ay,by)+width+1));y++)
        for(let x=Math.max(0,Math.floor(Math.min(ax,bx)-width-1));x<=Math.min(W-1,Math.ceil(Math.max(ax,bx)+width+1));x++) {
            const u=length?clamp(((x+.5-ax)*dx+(y+.5-ay)*dy)/length):0,a=clamp(width+.6-Math.hypot(x+.5-ax-u*dx,y+.5-ay-u*dy));
            if(a>0) paint(y*W+x,rgb,a,lit);
        }
}
function ellipse(cx,cy,rx,ry,rgb,lit=0) {
    cx*=S;cy*=S;rx*=S;ry*=S;
    for(let y=Math.max(0,Math.floor(cy-ry-1));y<=Math.min(H-1,Math.ceil(cy+ry+1));y++)
        for(let x=Math.max(0,Math.floor(cx-rx-1));x<=Math.min(W-1,Math.ceil(cx+rx+1));x++) {
            const a=clamp((1-Math.hypot((x+.5-cx)/rx,(y+.5-cy)/ry))*Math.min(rx,ry)+.6);
            if(a>0) paint(y*W+x,rgb,a,lit);
        }
}
function pine(bx,by,height,lean,spread,rgb,warm,seed) {
    shadows.push({x:bx,y:by,height,width:spread*.22,tree:true});
    const radius=Math.hypot(bx-193,by-156),s=(bx-193)/radius,c=(156-by)/radius,tx=bx+lean*.1,ty=by-height;
    const limb=(ax,ay,ex,ey,width)=>{
        const x0=bx+(ax-bx)*c-(ay-by)*s,y0=by+(ax-bx)*s+(ay-by)*c,x1=bx+(ex-bx)*c-(ey-by)*s,y1=by+(ex-bx)*s+(ey-by)*c;
        if(warm) line(x0+.25,y0,x1+.25,y1,width+.14,[.31,.18,.065],.045);
        line(x0,y0,x1,y1,width,rgb);
    };
    limb(bx,by,tx,ty,height*.012);
    for(let d=2;d<height*.88;d+=2.2+hash(seed,d*11)*1.8) {
        const u=d/height,x=tx-lean*.1*u,y=ty+d,reach=spread*u*(.75+hash(seed+1,d*7)*.45);
        for(const side of [-1,1]) {
            const ex=x+side*reach,ey=y+reach*.38+hash(seed+side,d*9);
            limb(x,y,ex,ey,.12+u*.12);limb(x+side*reach*.36,y+reach*.18,ex+side*.8,ey-1.15,.07);
            for(let j=.35;j<1;j+=.22) { const nx=x+(ex-x)*j,ny=y+(ey-y)*j;limb(nx,ny,nx-side*(.5+u),ny+1+u*1.3,.06); }
        }
    }
}
for(const [x,y,h,l,s] of [[124,95,30,-9,8],[136,88,26,-6,7],[166,75,40,-6,8],[187,71,27,-2,5],[201,72,35,-1,5]]) pine(x,y,h,l,s,[.01,.04,.03],false,x);
pine(164,74,43,-3,7,BARK,true,42);pine(132,89,30,-7,8,INK,true,51);
ellipse(142,89,2.6,1.5,[.065,.10,.085]);line(141,88,143,87,.6,[.29,.22,.12],.055);line(137,102,130,113,1.4,[.027,.06,.06]);
shadows.push({x:188,y:71,height:18,width:5.2,tree:false});
line(183,65,177,71,.65,[.32,.20,.085],.025);line(191,65,198,72,.7,[.30,.18,.08]);line(187,65,188,70,.6,INK);line(176,72,179,71,.45,INK);line(197,72,199,73,.45,INK);
ellipse(182.4,61,6.2,5.1,[.65,.37,.13],.02);ellipse(183.2,60.5,6.1,4.9,INK);ellipse(188.5,59.7,8.1,5.5,INK);ellipse(197.7,61,3,2,INK);
line(194,56,195,53.6,.5,INK);line(190.5,55,192.4,53.7,.65,INK);line(184.2,57,183.2,54.1,.45,[.12,.20,.19]);ellipse(182.9,53.2,3.7,1.6,[.027,.09,.095]);line(181,54,180.5,51.2,.25,[.42,.26,.11]);ellipse(181.7,63.6,.8,.4,[.68,.39,.14],.02);line(188,66,184,66.4,.6,INK);
ellipse(161,84.7,3.5,1.7,INK);line(161.3,80.8,163,84.1,1.6,INK);ellipse(160.3,78,1.9,1.9,[.39,.28,.09],.04);ellipse(160.8,77.7,1.7,1.8,INK);
line(162,80,163.6,82.5,1.1,INK);line(163,85,165,81.9,1.1,INK);line(165,82,167.4,85.8,.9,INK);line(164,86,167.5,86.4,.65,INK);
line(160.8,80.8,158.4,82.2,.5,[.12,.12,.06],.05);line(158.5,82,156.8,80.9,.35,[.52,.28,.08],.06);line(157.8,81.8,153.6,76.6,.09,[.40,.30,.15]);ellipse(153.5,76.5,.45,.35,[.83,.70,.42],.05);
for(let i=0;i<7;i++) { const a=i*Math.PI*2/7,across=Math.cos(a)*2.4,down=Math.sin(a)*.8+1;ellipse(FX+across*FC-down*FS,FY+across*FS+down*FC,.75,.5,[.10,.16,.14]); }
line(FX-2.4*FC-.6*FS,FY-2.4*FS+.6*FC,FX+2.2*FC+.3*FS,FY+2.2*FS-.3*FC,.45,[.16,.095,.04],.1);
line(FX-1.5*FC+.2*FS,FY-1.5*FS-.2*FC,FX+1.5*FC-FS,FY+1.5*FS+FC,.45,[.16,.095,.04],.1);
pine(145,117,60,-40,14,INK,false,71);line(144.5,99,126,83,.6,[.26,.18,.09],.035);pine(178,117,26,-3,8,INK,true,78);pine(162,125,25,-4,7,INK,false,82);
const shade=new Float32Array(N);
for(const object of shadows) {
    const dx=object.x-FX,dy=object.y-FY,distance=Math.hypot(dx,dy);if(distance<.5) continue;
    const ux=dx/distance,uy=dy/distance,length=Math.min(110,distance*object.height/4);
    for(let along=0;along<length;along+=.45) {
        const u=along/length,px=object.x+ux*along,py=object.y+uy*along;if(Math.hypot(px-193,py-156)>86.3) break;
        const spread=along/(distance+object.height*.5),width=object.width*(1+spread)*(object.tree?1-u*.85:1),softness=.4+spread*.65,extent=(width+softness)*S,cx=px*S,cy=py*S;
        for(let y=Math.max(0,Math.floor(cy-extent));y<=Math.min(H-1,Math.ceil(cy+extent));y++) for(let x=Math.max(0,Math.floor(cx-extent));x<=Math.min(W-1,Math.ceil(cx+extent));x++) {
            const k=y*W+x;if(!ground[k]) continue;
            const across=Math.hypot(x+.5-cx,y+.5-cy)/S,amount=(1-smooth(width*.65,width+softness,across))*(1-smooth(.82,1,u));shade[k]=Math.max(shade[k],amount);
        }
    }
}
for(let k=0;k<N;k++) { const shadow=shade[k]*ground[k]*.92;sr[k]-=fr[k]*shadow;sg[k]-=fg[k]*shadow;sb[k]-=fb[k]*shadow;fr[k]*=1-shadow;fg[k]*=1-shadow;fb[k]*=1-shadow; }
const turbulence=new Float32Array(128*128);
for(let y=0;y<128;y++) for(let x=0;x<128;x++) turbulence[y*128+x]=noise(x*.24,y*.24);
const flames=[];
for(let y=Math.floor((FY-11)*S);y<=Math.ceil((FY+5)*S);y++) for(let x=Math.floor((FX-12)*S);x<=Math.ceil((FX+6)*S);x++) {
    const dx=(x+.5)/S-FX,dy=(y+.5)/S-FY,across=dx*FC+dy*FS,h=dx*FS-dy*FC;
    if(h>=0&&h<8&&Math.abs(across)<4) flames.push({k:y*W+x,across,h});
}
const canvas=document.querySelector('.outer-wilds'),context=canvas.getContext('2d');
// Each source cell is a square halftone dot, with the supplied four coverage levels.
const CELL=3,COVER=[0,.3,.6,1],BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>v/16-.47);
canvas.width=W*CELL;canvas.height=H*CELL;
const image=context.createImageData(canvas.width,canvas.height),pixels=image.data;
const lut=new Uint8Array(32768).fill(255);
function nearest(r,g,b) {
    const key=((r*31.99|0)<<10)|((g*31.99|0)<<5)|(b*31.99|0);if(lut[key]!==255) return lut[key];
    let best=0,distance=Infinity;
    for(let i=0;i<palette.length;i++) { const p=palette[i],d=.3*(p[0]-r)**2+.5*(p[1]-g)**2+.2*(p[2]-b)**2;if(d<distance) {distance=d;best=i;} }
    return lut[key]=best;
}
function render(t) {
    const pulse=Math.sin(t * 1.4) * 0.06 + Math.sin(t * 2.3 + 1) * 0.025 + Math.sin(t * 0.7) * 0.035;
    for(let k=0;k<N;k++) {const v=light[k]*pulse;cr[k]=sr[k]+fr[k]*pulse+v;cg[k]=sg[k]+fg[k]*pulse+v*.66;cb[k]=sb[k]+fb[k]*pulse+v*.19;}
    for(let i=0;i<16;i++) {
        const age=((t*.11+i/16)%1+1)%1,up=3+age*55,drift=-age*12+Math.sin(age*10+t*.35)*(.4+age*2),px=(FX+drift*FC+up*FS)*S,py=(FY+drift*FS-up*FC)*S,radius=(.9+age*4.8)*S;
        const opacity=smooth(0,.035,age)*(1-smooth(.65,1,age))*.55,warmth=Math.exp(-age*5);
        for(let y=Math.max(0,Math.floor(py-radius*1.35));y<Math.min(H,Math.ceil(py+radius*1.35));y++) for(let x=Math.max(0,Math.floor(px-radius*1.4));x<Math.min(W,Math.ceil(px+radius*1.4));x++) {
            const k=y*W+x;if(solid[k]) continue;
            const n=turbulence[((y+Math.floor(t*4))&127)*128+((x+Math.floor(t*2))&127)],d=((x+.5-px)/radius)**2+((y+.5-py)/(radius*1.2))**2,a=clamp((1-d+(n-.5)*.85)*2)*opacity;
            cr[k]+=(.09+warmth*.50-cr[k])*a;cg[k]+=(.16+warmth*.22-cg[k])*a;cb[k]+=(.17+warmth*.045-cb[k])*a;
        }
    }
    for(const {k,across,h} of flames) {
        let flame=0;
        for(let j=0;j<3;j++) {const height=4.1+Math.sin(t*(6.5+j)+j*2)*1.1+j*.7,u=h/height,center=(j-1)*1.25-u*1.4+Math.sin(u*4+t*7+j)*u*.65,width=(1-u)*(1.15-j*.1);if(u>=0&&u<1) flame=Math.max(flame,clamp((width-Math.abs(across-center))*S+.65));}
        if(flame>0) {const core=clamp(1-h/4.3);cr[k]+=(1-cr[k])*flame;cg[k]+=(.31+core*.65-cg[k])*flame;cb[k]+=(.025+core*.22-cb[k])*flame;}
    }
    for(let i=0;i<19;i++) {
        const age=((t*(.23+hash(i,201)*.1)+hash(i,202))%1+1)%1,up=2+age*(14+hash(i,204)*14),drift=-age*(3+hash(i,203)*7)+Math.sin(age*8+i)*1.5;
        const x=Math.round((FX+drift*FC+up*FS)*S),y=Math.round((FY+drift*FS-up*FC)*S);if(x<0||x>=W||y<0||y>=H) continue;
        const k=y*W+x;if(solid[k]) continue;const v=(1-age)*(.65+.35*Math.sin(t*9+i)**2);cr[k]=Math.max(cr[k],v);cg[k]=Math.max(cg[k],v*.34);cb[k]=Math.max(cb[k],v*.06);
    }
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) {
        const k=y*W+x,r=clamp(cr[k]),g=clamp(cg[k]),b=clamp(cb[k]),peak=Math.max(r,g,b,.0001),level=peak<.014?0:clamp(peak**.65*.98);
        const step=Math.max(0,Math.min(3,Math.round(level*3+BAYER[(y&3)*4+(x&3)]))),want=step?Math.min(1,(level+.06)/COVER[step]):0,scale=(.3+.7*want)/peak;
        const p=palette[nearest(clamp(r*scale),clamp(g*scale),clamp(b*scale))];
        for(let dy=0;dy<CELL;dy++) for(let dx=0;dx<CELL;dx++) {
            const offset=((y*CELL+dy)*canvas.width+x*CELL+dx)*4;
            const ink=step===3||(step===2&&(dx===1||dy===1))||(step===1&&dx===1&&dy===1);
            pixels[offset]=p[0]*255;pixels[offset+1]=p[1]*255;pixels[offset+2]=p[2]*255;pixels[offset+3]=ink?255:0;
        }
    }
    context.putImageData(image,0,0);
}

// Fixed-size star tiles are anchored to the camp's bottom-right corner.
// Resizing reveals or crops tiles without scaling or redistributing stars.
const sky = document.querySelector('.outer-wilds-stars');
const skyContext = sky.getContext('2d');
const stars = [];
let skyWidth = 0, skyHeight = 0;
function resizeSky() {
    skyWidth = window.innerWidth;
    skyHeight = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    sky.width = Math.round(skyWidth * ratio);
    sky.height = Math.round(skyHeight * ratio);
    skyContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars.length = 0;
    const bounds = canvas.getBoundingClientRect();
    const tile = 128;
    const firstX = Math.floor(-bounds.right / tile);
    const lastX = Math.ceil((skyWidth - bounds.right) / tile);
    const firstY = Math.floor(-bounds.bottom / tile);
    const lastY = Math.ceil((skyHeight - bounds.bottom) / tile);
    for (let row = firstY; row < lastY; row++) {
        for (let col = firstX; col < lastX; col++) {
            for (let i = 0; i < 4; i++) {
                const seedX = col * 4 + i, seedY = row * 7;
                stars.push({x: (col + hash(seedX, seedY + 101)) * tile,
                    y: (row + hash(seedX, seedY + 102)) * tile,
                    phase: hash(seedX, seedY + 104) * Math.PI * 2,
                    size: hash(seedX, seedY + 105), speed: .7 + hash(seedX, seedY + 106)});
            }
        }
    }
    renderSky(reducedMotion.matches ? 0 : performance.now() / 1000);
}
function renderSky(t) {
    skyContext.clearRect(0, 0, skyWidth, skyHeight);
    const bounds = canvas.getBoundingClientRect();
    for (const star of stars) {
        const screenX = Math.floor(bounds.right + star.x);
        const screenY = Math.floor(bounds.bottom + star.y);
        const x = Math.floor((screenX - bounds.left) / bounds.width * W);
        const y = Math.floor((screenY - bounds.top) / bounds.height * H);
        if (x >= 0 && x < W && y >= 0 && y < H && solid[y * W + x]) continue;
        const v = (.45 + star.size * .5) * (.73 + .27 * Math.sin(t * star.speed + star.phase));
        skyContext.fillStyle = `rgba(184,230,255,${v})`;
        const size = star.size > .92 ? 2 : 1;
        skyContext.fillRect(screenX, screenY, size, size);
        if (star.size > .92) {
            skyContext.fillStyle = `rgba(184,230,255,${v * .17})`;
            skyContext.fillRect(screenX - 1, screenY, 4, 1);
            skyContext.fillRect(screenX, screenY - 1, 1, 4);
        }
    }
}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let visible=false,request=0,last=-Infinity;
function tick(now) {
    request=0;
    if(document.hidden||reducedMotion.matches) return;
    if(now-last>=1000/15) {if(visible) render(now/1000);renderSky(now/1000);last=now;}
    request=requestAnimationFrame(tick);
}
function resume() {
    if(request) cancelAnimationFrame(request);
    request=0;
    if(!document.hidden&&!reducedMotion.matches) request=requestAnimationFrame(tick);
}
render(0);
resizeSky();
window.addEventListener('resize', resizeSky);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume();}).observe(canvas);
document.addEventListener('visibilitychange',resume);
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches) {render(0);renderSky(0);}resume();});
