import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseModelAnalysis } from "../src/wardrobe.js";

const __filename=fileURLToPath(import.meta.url);
const root=resolve(dirname(__filename),"..");
if(existsSync(resolve(root,".env.local"))&&typeof process.loadEnvFile==="function"){
  process.loadEnvFile(resolve(root,".env.local"));
}
const contentTypes={
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".webp":"image/webp",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".ico":"image/x-icon"
};
const MAX_BODY=3*1024*1024;

function reply(res,status,body){
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  });
  res.end(JSON.stringify(body));
}
async function readJson(req){
  const chunks=[];let total=0;
  for await(const chunk of req){
    total+=chunk.length;
    if(total>MAX_BODY){
      const error=new Error("图片过大，请压缩后重试");error.status=413;throw error;
    }
    chunks.push(chunk);
  }
  try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}
  catch{const error=new Error("请求必须是 JSON");error.status=400;throw error;}
}
export async function analyzeGarment(input,env=process.env){
  const base=env.DEEPSEEK_BASE_URL?.trim().replace(/\/+$/,"");
  const key=env.DEEPSEEK_API_KEY?.trim();
  const model=env.DEEPSEEK_MODEL?.trim();
  if(!base||!key||!model){
    const error=new Error("尚未配置本地 DeepSeek API。请设置 .env.local");error.status=503;throw error;
  }
  if(!/^https?:\/\//.test(base)){
    const error=new Error("DEEPSEEK_BASE_URL 必须是 API 地址");error.status=400;throw error;
  }
  if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(input?.image||"")){
    const error=new Error("请上传支持的图片格式");error.status=400;throw error;
  }
  const endpoint=base.endsWith("/chat/completions")?base:base+"/chat/completions";
  const photoType=input.photoType==="worn"?"穿在身上的照片":"衣物单品照";
  const body={
    model,
    max_tokens:250,
    messages:[
      {role:"system",content:"你是服装图片分类助手。仅返回有效 JSON 对象，键为 name(中文短名称), category(top/bottom/dress/outer/shoes/accessory), style(上衣 tee/shirt/sweater；下装 pants/skirt/shorts；裙装 dress/longdress；外套 jacket/coat；鞋 sneakers/boots；配饰 scarf/bow), color(主要衣服颜色 #RRGGBB)。只判断图片中最主要的一件服饰，不得编造无关事实。不要 markdown。"},
      {role:"user",content:[
        {type:"text",text:"这是一张"+photoType+"。请识别最主要的服装。"},
        {type:"image_url",image_url:{url:input.image}}
      ]}
    ]
  };
  let response;
  try{
    response=await fetch(endpoint,{
      method:"POST",
      headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify(body),
      signal:AbortSignal.timeout(45000)
    });
  }catch{
    const error=new Error("无法连接学校模型，检查网络、VPN 和 API URL");error.status=502;throw error;
  }
  if(!response.ok){
    const error=new Error("学校模型接口返回 HTTP "+response.status+"；请确认模型支持图像输入");
    error.status=502;throw error;
  }
  let json;
  try{json=await response.json();}
  catch{const error=new Error("学校模型返回了非 JSON 响应");error.status=502;throw error;}
  const text=json?.choices?.[0]?.message?.content;
  try{return parseModelAnalysis(text);}
  catch{const error=new Error("模型未返回可解析的服装信息");error.status=502;throw error;}
}
async function serveFile(pathname,res){
  let pathnameDecoded;
  try{pathnameDecoded=decodeURIComponent(pathname);}
  catch{reply(res,400,{error:"无效路径"});return;}
  if(pathnameDecoded.includes("\0")||pathnameDecoded.split("/").includes("..")){
    reply(res,403,{error:"禁止访问"});return;
  }
  const target=resolve(root,"."+ (pathnameDecoded==="/"?"/index.html":pathnameDecoded));
  if(!target.startsWith(root+sep)||target.includes("/server/")||target.includes("/tests/")||target.endsWith("/.env.local")||target.endsWith("/.env")){
    reply(res,403,{error:"禁止访问"});return;
  }
  const type=contentTypes[extname(target)];
  if(!type){reply(res,404,{error:"未找到文件"});return;}
  try{
    const info=await stat(target);
    if(!info.isFile())throw new Error("not a file");
    const file=await readFile(target);
    res.writeHead(200,{"Content-Type":type,"Cache-Control":"no-cache","X-Content-Type-Options":"nosniff"});
    res.end(file);
  }catch{reply(res,404,{error:"文件不存在"});}
}
export function createAppServer(){
  return createServer(async(req,res)=>{
    try{
      const url=new URL(req.url||"/","http://localhost");
      if(url.pathname==="/api/health"&&req.method==="GET"){
        reply(res,200,{status:"ok",aiConfigured:Boolean(process.env.DEEPSEEK_API_KEY&&process.env.DEEPSEEK_MODEL&&process.env.DEEPSEEK_BASE_URL)});
        return;
      }
      if(url.pathname==="/api/analyze"&&req.method==="POST"){
        if(req.headers["content-type"]?.split(";")[0]!=="application/json"){
          reply(res,415,{error:"只接受 JSON 图片数据"});return;
        }
        const data=await readJson(req);
        const analysis=await analyzeGarment(data);
        reply(res,200,analysis);return;
      }
      if(url.pathname.startsWith("/api/")){reply(res,404,{error:"API 路由不存在"});return;}
      if(req.method!=="GET"&&req.method!=="HEAD"){reply(res,405,{error:"不支持该方法"});return;}
      await serveFile(url.pathname,res);
    }catch(error){reply(res,error.status||500,{error:error.status?error.message:"服务器暂时出错"});}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===__filename){
  const port=Number(process.env.PORT||3000);
  createAppServer().listen(port,"127.0.0.1",()=>{
    console.log("MORI Closet http://127.0.0.1:"+port);
    console.log("Only accessible from this computer; photos remain in the browser by default.");
  });
}
