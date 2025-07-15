import React from 'react';
import { Product } from '@/shared/interfaces/Iproduct.interface'; // Adjusted path
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductTabsProps {
  product: Product;
}

const ProductTabs: React.FC<ProductTabsProps> = ({ product }) => {
  if (!product) return null;

  // Helper to format text with line breaks
  const formatTextWithLineBreaks = (text: string | undefined) => {
    if (!text) return '';
    return text.replace(/<br\s*\/?>/gi, '<br class="block mb-2">');
  };

  return (
    <Tabs defaultValue="details" className="mt-8">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Détails</TabsTrigger>
        <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
        <TabsTrigger value="care">Entretien</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="mt-4">
        <div
          className="text-stone-600 text-sm space-y-2"
          dangerouslySetInnerHTML={{
            __html: formatTextWithLineBreaks(product.details),
          }}
        />
      </TabsContent>
      <TabsContent value="dimensions" className="mt-4">
        {/* Assuming dimensions might be part of details or a separate field later */}
        {/* For now, using a placeholder or could also use product.details if appropriate */}
        <div className="text-stone-600 text-sm">
          {product.dimensions || "Veuillez consulter les informations détaillées pour les dimensions spécifiques de ce produit."}
        </div>
      </TabsContent>
      <TabsContent value="care" className="mt-4">
        <div
          className="text-stone-600 text-sm space-y-2"
          dangerouslySetInnerHTML={{
            __html: formatTextWithLineBreaks(product.care),
          }}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ProductTabs;
