/** Reviewed public origin for same-site, cookie-authenticated project writes. */
export function approvedPublicOrigin():string|null{
  const raw=process.env.VSPH_PUBLIC_ORIGIN;
  if(!raw)return null;
  try{
    const u=new URL(raw);
    const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
    if(raw!==u.origin||u.username||u.password||u.pathname!=='/'||
      u.search||u.hash||(u.protocol!=='https:'&&!(local&&u.protocol==='http:')))return null;
    return u.origin;
  }catch{return null;}
}
export function validPortalSession(value:string|undefined):value is string {
  return typeof value==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(value);
}
