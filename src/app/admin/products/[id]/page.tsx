"use client";

import { useParams } from "next/navigation";
import { ProductFormScreen } from "@/components/admin/ProductFormScreen";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductFormScreen mode="edit" productId={id} />;
}
