
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import postgres from "npm:postgres@3.4.7";
const db=postgres(Deno.env.get("SUPABASE_DB_URL")!,{prepare:false,max:2});
const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const sites=new Set(["https://graintrace-warehouse-lawal-sulaiman-s-projects.vercel.app","https://graintrace-warehouse.vercel.app"]);
const headers=(req:Request)=>({"Access-Control-Allow-Origin":sites.has(req.headers.get("origin")||"")?req.headers.get("origin")!:"null","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin","X-Content-Type-Options":"nosniff"});
const json=(req:Request,body:unknown,status=200)=>Response.json(body,{status,headers:headers(req)});
async function digest(s:string){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(h)].map(v=>v.toString(16).padStart(2,"0")).join("")}
const randomToken=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,"0")).join("");
async function admin(req:Request){const a=req.headers.get("authorization")||"";if(!a.startsWith("Bearer "))return null;const {data,error}=await sb.auth.getUser(a.slice(7));if(error||!data.user)return null;const r=await db.unsafe("select user_id from graintrace.admin_users where user_id=$1::uuid",[data.user.id]);return r.length?data.user.id:null}
async function audit(req:Request,u:URL){
const token=u.searchParams.get("token")||"";
if(!/^[a-f0-9]{64}$/.test(token))return json(req,{error:"Report unavailable"},404);
const links=await db.unsafe("select id,dispatch_id,expires_at,revoked_at from graintrace.audit_links where token_hash=$1",[await digest(token)]);
if(!links.length)return json(req,{error:"Report unavailable"},404);
const l=links[0],outcome=l.revoked_at?"revoked":new Date(l.expires_at).getTime()<=Date.now()?"expired":"granted";
await db.unsafe("insert into graintrace.audit_access_logs(link_id,outcome,user_agent) values ($1,$2,$3)",[l.id,outcome,(req.headers.get("user-agent")||"").slice(0,250)]);
if(outcome!=="granted")return json(req,{error:outcome==="expired"?"Expired link":"Revoked link"},403);
const dispatch=(await db.unsafe("select reference,buyer,scale_kg,dispatched_at from graintrace.dispatches where id=$1",[l.dispatch_id]))[0];
if(!dispatch)return json(req,{error:"Dispatch unavailable"},404);
const sources=await db.unsafe("select m.id as mill_id,m.name as mill,m.address,m.latitude,m.longitude,r.reference as gate_receipt,r.received_at,b.code as bag,b.gate_kg,b.clean_kg,(b.gate_kg-b.clean_kg) as cleaning_loss_kg,dl.weight_kg as dispatched_kg from graintrace.dispatch_lines dl join graintrace.bags b on b.id=dl.bag_id join graintrace.receipts r on r.id=b.receipt_id join graintrace.mills m on m.id=r.mill_id where dl.dispatch_id=$1 order by m.name,b.code",[l.dispatch_id]);
const docs:any[]=[];
for(const millId of [...new Set(sources.map(x=>String(x.mill_id)))]){
 const rows=await db.unsafe("select label,object_path from graintrace.documents where mill_id=$1 and audit_visible=true",[millId]);
 for(const doc of rows){const {data,error}=await sb.storage.from("graintrace-documents").createSignedUrl(doc.object_path,60);if(!error&&data?.signedUrl)docs.push({mill_id:millId,label:doc.label,url:data.signedUrl,expires_in_seconds:60})}
}
return json(req,{demo:true,dispatch,sources,documents:docs});
}
async function manage(req:Request){
const uid=await admin(req);if(!uid)return json(req,{error:"Administrator authentication required"},401);
let x:any;try{x=await req.json()}catch{return json(req,{error:"Invalid JSON"},400)}
if(x.action==="list"){
const dispatches=await db.unsafe("select id,reference,buyer,scale_kg,dispatched_at from graintrace.dispatches order by dispatched_at desc limit 100");
const links=await db.unsafe("select l.id,l.dispatch_id,d.reference,l.expires_at,l.revoked_at,l.created_at,(select count(*)::int from graintrace.audit_access_logs a where a.link_id=l.id and a.outcome='granted') as views from graintrace.audit_links l join graintrace.dispatches d on d.id=l.dispatch_id order by l.created_at desc limit 100");
const mills=await db.unsafe("select id,name,address,latitude,longitude from graintrace.mills order by name");
return json(req,{dispatches,links,mills});
}
if(x.action==="create"){
const did=String(x.dispatchId||""),days=Number(x.days);
if(!/^[a-f0-9-]{36}$/i.test(did)||!Number.isInteger(days)||days<1||days>30)return json(req,{error:"Invalid dispatch or expiry"},400);
if(!(await db.unsafe("select id from graintrace.dispatches where id=$1",[did])).length)return json(req,{error:"Dispatch not found"},404);
const t=randomToken(),h=await digest(t),expiry=new Date(Date.now()+days*86400000).toISOString();
const r=await db.unsafe("insert into graintrace.audit_links(dispatch_id,token_hash,expires_at,created_by) values ($1,$2,$3,$4) returning id,expires_at",[did,h,expiry,uid]);
return json(req,{id:r[0].id,expires_at:r[0].expires_at,url:"https://graintrace-warehouse-lawal-sulaiman-s-projects.vercel.app/audit.html?t="+t});
}
if(x.action==="revoke"){
const id=String(x.linkId||"");if(!/^[a-f0-9-]{36}$/i.test(id))return json(req,{error:"Invalid link"},400);
const r=await db.unsafe("update graintrace.audit_links set revoked_at=now() where id=$1 and revoked_at is null returning id",[id]);
return json(req,{revoked:r.length>0});
}
if(x.action==="upload"){
const mid=String(x.millId||""),label=String(x.label||"").trim().slice(0,120),mime=String(x.mime||""),base64=String(x.base64||"");
if(!/^[a-f0-9-]{36}$/i.test(mid)||!label||!["application/pdf","image/jpeg","image/png"].includes(mime)||base64.length>6000000)return json(req,{error:"Invalid document"},400);
if(!(await db.unsafe("select id from graintrace.mills where id=$1",[mid])).length)return json(req,{error:"Mill missing"},404);
let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(base64),v=>v.charCodeAt(0))}catch{return json(req,{error:"Invalid file encoding"},400)}
if(bytes.length===0||bytes.length>4000000)return json(req,{error:"File size must be 1–4 MB"},400);
const ext=mime==="application/pdf"?"pdf":mime==="image/png"?"png":"jpg",path=mid+"/"+crypto.randomUUID()+"."+ext;
const up=await sb.storage.from("graintrace-documents").upload(path,bytes,{contentType:mime,upsert:false});
if(up.error)return json(req,{error:"Upload failed"},500);
const r=await db.unsafe("insert into graintrace.documents(mill_id,label,object_path,mime_type,audit_visible) values ($1,$2,$3,$4,$5) returning id,label",[mid,label,path,mime,x.auditVisible===true]);
return json(req,{document:r[0]});
}
return json(req,{error:"Unknown action"},400);
}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(req)});
try{const u=new URL(req.url);if(req.method==="GET"&&u.searchParams.get("action")==="audit")return await audit(req,u);if(req.method==="POST")return await manage(req);return json(req,{error:"Not found"},404)}
catch(e){console.error("GrainTrace audit error",e);return json(req,{error:"Service unavailable"},500)}});
