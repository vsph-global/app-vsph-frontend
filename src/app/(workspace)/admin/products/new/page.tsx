import type {Metadata} from 'next';
import Link from 'next/link';
import {loadProductDirectory} from '@/features/operations/product-registry-server';
import {ProductRegistryEditor} from '@/features/operations/ProductRegistryEditor';
import '../../../product-registry-live.css';
export const metadata:Metadata={title:'Register product | VSPH Control Center',
 robots:{index:false,follow:false}};
export default async function NewProductPage(){
 // Reuse exact platform-owner entitlement check; never expose a write-only admin page.
 const records=await loadProductDirectory(null);
 if(!records)return <main className="workspace-content product-live-workspace" id="mainContent">
   <h1>Product registration unavailable</h1>
   <p role="alert">Your platform-owner permission or product registry could not be verified.</p>
   <Link href="/admin/products">Return to product registry</Link>
 </main>;
 return <ProductRegistryEditor product={null}/>;
}
