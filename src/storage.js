const DATABASE="mori-closet-v1";
let connection;
function database(){
  if(!connection){
    connection=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DATABASE,1);
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains("items")) request.result.createObjectStore("items",{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  return connection;
}
async function requestInStore(mode,callback){
  const db=await database();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction("items",mode);
    const request=callback(transaction.objectStore("items"));
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    transaction.onerror=()=>reject(transaction.error);
  });
}
export const listItems=()=>requestInStore("readonly",store=>store.getAll());
export const saveItem=item=>requestInStore("readwrite",store=>store.put(item));
export const deleteItem=id=>requestInStore("readwrite",store=>store.delete(id));
export function readPreference(key,fallback){
  try{
    const value=localStorage.getItem("mori:"+key);
    return value===null?fallback:JSON.parse(value);
  }catch{return fallback;}
}
export function savePreference(key,value){localStorage.setItem("mori:"+key,JSON.stringify(value));}
