"use client";

import type { ReactNode } from "react";
import type { Product } from "@/lib/analytics";
import { CategoryIcon, Row } from "./ui";

export const productHref = (key: string) => `/produtos/${encodeURIComponent(key)}`;

export function ProductRow({
  product,
  subtitle,
  value,
  valueSub,
  leading,
}: {
  product: Product;
  subtitle?: ReactNode;
  value?: ReactNode;
  valueSub?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <Row
      href={productHref(product.key)}
      icon={
        leading ? (
          <div className="flex items-center gap-2.5">
            {leading}
            <CategoryIcon category={product.category} />
          </div>
        ) : (
          <CategoryIcon category={product.category} />
        )
      }
      title={product.name}
      subtitle={subtitle}
      value={value}
      valueSub={valueSub}
      chevron
    />
  );
}
