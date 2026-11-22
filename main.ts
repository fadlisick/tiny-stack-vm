import{readFileSync as A,readdirSync as B,mkdirSync as C,writeFileSync as D}from"node:fs";
const I=process.env.MAKEFUN_INPUT_DIR||"/input",O=process.env.MAKEFUN_OUTPUT_DIR||"/output",P="000112230000000022222221222122202220000000000000011000000000000012000000000000001101",Q="011022330000000011111111111111101110000000000000000000000000000010000000000000000010",F=[(a,b)=>a+b|0,(a,b)=>a-b|0,Math.imul,(a,b)=>b?a==-2147483648&&b==-1?a:a/b|0:NaN,(a,b)=>b?b==-1?0:a%b|0:NaN,(a,b)=>b?Math.floor((a>>>0)/(b>>>0))|0:NaN,(a,b)=>b?(a>>>0)%(b>>>0)|0:NaN,0,(a,b)=>a&b,(a,b)=>a|b,(a,b)=>a^b,0,(a,b)=>a<<(b&31),(a,b)=>a>>(b&31),(a,b)=>a>>>(b&31)|0,0,(a,b)=>a==b,(a,b)=>a<b,(a,b)=>a>>>0<b>>>0];
let T=n=>new Int32Array(n);
function R(p,q){
let n=p.length,s=T(256),c=T(64),m=T(256),o=new Uint8Array(1<<16),e=new TextEncoder(),a=0,d=0,l=0,i=0,x=0,t=0,z,r,w,j,b;
let f=v=>({out:o.slice(0,l),exit:v});
for(;;){
if(t==1e6)return f(10);
if(x<0||x>=n)return f(9);
let g=p[x],h=g==1?1:g==2?4:g>47&&g<52?2:0;
if(!(g<8||g>15&&g<35&&g!=31||g>47&&g<53||g==64||g==65||g>79&&g<84))return f(5);
if(x+h>=n)return f(9);
t++;
let y=x+1+h,u=P[g]|0,v=Q[g]|0;
if(a<u)return f(2);
if(a-u+v>256)return f(3);
x=y;
switch(g){
case 0:return f(0);
case 1:case 2:s[a++]=g==1?(p[y-1]<<24)>>24:p[y-4]|p[y-3]<<8|p[y-2]<<16|p[y-1]<<24;break;
case 3:a--;break;
case 4:case 6:s[a]=s[a-(g==4?1:2)];a++;break;
case 5:z=s[a-1];s[a-1]=s[a-2];s[a-2]=z;break;
case 7:z=s[a-3];s[a-3]=s[a-2];s[a-2]=s[a-1];s[a-1]=z;break;
case 23:case 27:s[a-1]=g==23?-s[a-1]|0:~s[a-1];break;
case 48:case 49:case 50:r=(p[y-2]|p[y-1]<<8)<<16>>16;w=g==48||(s[--a]==0)==(g==49);if(w)x=y+r;break;
case 51:if(d==64)return f(7);c[d++]=y;x=p[y-2]|p[y-1]<<8;break;
case 52:if(!d)return f(8);x=c[--d];break;
case 64:j=s[a-1];if(j<0||j>255)return f(6);s[a-1]=m[j];break;
case 65:j=s[a-1];if(j<0||j>255)return f(6);a-=2;m[j]=s[a];break;
case 80:b=e.encode(""+s[a-1]);if(l+b.length>65536)return f(11);a--;o.set(b,l);l+=b.length;break;
case 81:if(l+1>65536)return f(11);o[l++]=s[--a]&255;break;
case 82:s[a++]=i<q.length?q[i++]:-1;break;
case 83:return f(s[--a]&255);
default:r=F[g-16](s[a-2],s[a-1]);if(r!=r)return f(4);a-=2;s[a++]=r;
}
}
}
for(let k of B(I)){let j=I+"/"+k,p;try{p=A(j+"/program.bin")}catch{continue}let q;try{q=A(j+"/input.bin")}catch{q=[]}let{out,exit}=R(p,q),d=O+"/"+k;C(d,{recursive:true});D(d+"/stdout.bin",out);D(d+"/exit.txt",exit+"\n");}
