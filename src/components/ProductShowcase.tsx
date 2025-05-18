
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const products = [
  {
    id: 1,
    name: "Natural Woven Tote",
    price: 89,
    image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
    category: "Bags",
    badge: "Bestseller",
  },
  {
    id: 2,
    name: "Wide-brim Straw Hat",
    price: 65,
    image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
    category: "Hats",
    badge: "New",
  },
  {
    id: 3,
    name: "Crossbody Satchel",
    price: 110,
    image: "https://images.unsplash.com/photo-1721322800607-8c38375eef04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
    category: "Bags",
  },
  {
    id: 4,
    name: "Panama Fedora",
    price: 75,
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
    category: "Hats",
  },
];

const ProductShowcase = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <Card key={product.id} className="bg-white border-none overflow-hidden group">
          <div className="relative">
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg">
              <img 
                src={product.image} 
                alt={product.name} 
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            {product.badge && (
              <Badge className="absolute top-2 right-2 bg-olive-700 text-white border-none">
                {product.badge}
              </Badge>
            )}
          </div>
          <CardContent className="p-4">
            <p className="text-sm text-olive-700 font-medium">{product.category}</p>
            <h3 className="font-serif text-lg font-medium text-stone-800 mt-1 mb-2">{product.name}</h3>
            <p className="text-stone-700 font-medium">${product.price}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProductShowcase;
