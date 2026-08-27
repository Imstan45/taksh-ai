import { prisma } from "@/lib/prisma";

export type Product = {
  id:string;
  code:string;
  name:string;
  description:string;
  product_type:"course"|"bundle";
  price_in_paise:number;
  reference_price_in_paise:number|null;
  courses:string[];
  features:string[];
};

export async function listProducts(){
  return prisma.$queryRaw<Product[]>`
    select product.id,product.code,product.name,product.description,product.product_type,
      product.price_in_paise,product.reference_price_in_paise,
      coalesce((select array_agg(mapping.course order by mapping.display_order) from public.product_courses mapping where mapping.product_id=product.id),'{}') courses,
      coalesce((select array_agg(feature.display_name order by feature.display_order) from public.product_features feature where feature.product_id=product.id),'{}') features
    from public.products product where product.active order by product.display_order,product.name`;
}

export async function getProduct(code:string){
  const rows=await prisma.$queryRaw<Product[]>`
    select product.id,product.code,product.name,product.description,product.product_type,
      product.price_in_paise,product.reference_price_in_paise,
      coalesce((select array_agg(mapping.course order by mapping.display_order) from public.product_courses mapping where mapping.product_id=product.id),'{}') courses,
      coalesce((select array_agg(feature.display_name order by feature.display_order) from public.product_features feature where feature.product_id=product.id),'{}') features
    from public.products product where product.code=${code} and product.active limit 1`;
  return rows[0]??null;
}
