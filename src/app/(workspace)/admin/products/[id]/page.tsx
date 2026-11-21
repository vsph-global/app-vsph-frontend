import type {Metadata} from 'next';
import Link from 'next/link';
import {loadProductDetail} from '@/features/operations/product-registry-server';
import {ProductRegistryEditor} from '@/features/operations/ProductRegistryEditor';
import '../../../product-registry-live.css';
export const metadata:Metadata={title:'Manage product | VSPH Control Center',
 robots:{index:false,follow:false}};
export default async function ProductDetailPage({params}:{
 params:Promise<{id:string}>;
}){
 const {id}=await params;
 const product=await loadProductDetail(id);
 if(!product)return <main className="workspace-content product-live-workspace" id="mainContent">
   <h1>Product unavailable</h1>
   <p role="alert">Your owner access or this product record could not be verified.</p>
   <Link href="/admin/products">Back to product registry</Link>
 </main>;
 return <ProductRegistryEditor product={product}/>;
}
