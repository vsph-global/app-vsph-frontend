import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {portalIdentity} from '@/features/workspace/contracts';
import {
  parseProducts,parseProduct,productCode,productUuid
} from './ProductRegistryContract';

/** Backend owner check remains authoritative; fail closed before rendering. */
async function owner(){
 const result=await portalApi('/api/auth/me');
 if(result.kind==='unauthorized')redirect('/login');
 const identity=result.kind==='ok'?portalIdentity(result.value):null;
 return identity?.platformRole==='super_admin';
}
export async function loadProductDirectory(afterCode:string|null){
 if(afterCode!==null&&!productCode(afterCode))return null;
 if(!await owner())return null;
 const url='/api/admin-management/product-registry'+
   (afterCode?'?afterCode='+encodeURIComponent(afterCode):'');
 const result=await portalApi(url);
 if(result.kind==='unauthorized')redirect('/login');
 return result.kind==='ok'?parseProducts(result.value):null;
}
export async function loadProductDetail(id:string){
 if(!productUuid(id)||!await owner())return null;
 const response=await portalApi('/api/admin-management/product-registry/item/'+id);
 if(response.kind==='unauthorized')redirect('/login');
 if(response.kind!=='ok')return null;
 const product=parseProduct(response.value);
 return product?.id.toLowerCase()===id.toLowerCase()?product:null;
}
