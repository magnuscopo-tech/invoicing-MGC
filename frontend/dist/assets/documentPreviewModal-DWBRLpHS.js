import{c as m,r as s,j as e,N as x,C as f,af as v,ag as y}from"./index-Bj9BUtxR.js";import{n as p,c as g}from"./documentApis-C5nMY0-1.js";import{D}from"./download-7wiYUTLX.js";/**
 * @license lucide-react v0.451.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=m("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.451.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=m("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);function E({open:t,documentId:a,docNumber:r="document",onClose:o=()=>{}}){const i=s.useRef(null),[u,l]=s.useState(!0),[h,c]=s.useState(!1);s.useEffect(()=>{if(!t||!a)return;(async()=>{l(!0);try{const d=await p(a);i.current&&d&&(i.current.srcdoc=d)}finally{l(!1)}})()},[t,a]);const w=async()=>{c(!0);try{const n=await g(a);n&&v(n,y(r))}finally{c(!1)}};return e.jsx(x,{open:t,title:"Document preview",description:r,size:"full",onClose:o,footer:e.jsxs(e.Fragment,{children:[e.jsx(f,{variant:"secondary",size:"sm",onClick:o,children:"Close"}),e.jsx(f,{size:"sm",icon:D,loading:h,onClick:w,children:"Download PDF"})]}),children:e.jsxs("div",{className:"relative min-h-[60vh] overflow-hidden rounded-xl border border-ink-200 bg-ink-50",children:[u&&e.jsxs("div",{className:"absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80",children:[e.jsx(j,{size:26,className:"animate-spin text-primary-600"}),e.jsx("p",{className:"text-sm font-medium text-ink-500",children:"Rendering preview…"})]}),e.jsx("iframe",{ref:i,title:"Document preview",className:"h-[70vh] w-full bg-white",sandbox:"allow-same-origin"})]})})}export{E as D,C as E,j as L};
