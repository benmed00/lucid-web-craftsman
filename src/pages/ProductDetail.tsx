// file_name : src/pages/ProductDetail.tsx

import { ArrowRight, Leaf, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Product } from "../shared/interfaces/Iproduct.interface";
import { useCart } from "../context/useCart";

// import { ErrorBoundary } from "@/components/ErrorBoundary";

// Mock product data - in a real application, this would come from an API
const products: Product[] = [
  {
    id: 1,
    name: "Sac à Main Tissé Traditionnel",
    price: 89,
    images: [
      "/lucid-web-craftsman/assets/images/sacs/sac_traditionnel.jpg",
      "/lucid-web-craftsman/assets/images/sacs/sac_traditionnel_vue1.jpg",
      "/lucid-web-craftsman/assets/images/sacs/sac_traditionnel_vue2.jpg",
      "/lucid-web-craftsman/assets/images/sacs/sac_traditionnel_vue3.jpg",
    ],
    category: "Sacs",
    description:
      "Ce sac à main tissé traditionnel est confectionné à la main par des artisans du Rif marocain. Chaque pièce est unique et représente des heures de travail minutieux. Les motifs berbères sont transmis de génération en génération.",
    details:
      "Dimensions: 30 x 25 x 12 cm<br>Matériau: Fibres végétales et laine<br>Doublure intérieure en coton<br>Fermeture par bouton magnétique<br>Une poche intérieure",
    care: "Nettoyage à sec uniquement<br>Éviter l'exposition prolongée au soleil<br>Conserver à l'abri de l'humidité",
    new: true,
    artisan: "Fatima Ouazzani",
    artisanStory:
      "Fatima vit dans un petit village des montagnes du Rif où elle a appris l'art du tissage de sa grand-mère dès l'âge de 12 ans. Elle consacre environ 18 heures à la création de chaque sac.",
    related: [2, 3, 6],
  },
  {
    id: 2,
    name: "Chapeau de Paille Berbère",
    price: 45,
    images: [
      "/lucid-web-craftsman/assets/images/chapeau_de_paille_berbere_2.jpg",
    ],
    category: "Chapeaux",
    description:
      "Un chapeau traditionnel berbère tissé à la main avec des fibres de palmier nain, offrant une protection élégante contre le soleil méditerranéen.",
    details:
      "Taille ajustable<br>Matériau: Fibres de palmier nain<br>Ruban décoratif en coton tissé",
    care: "Nettoyer avec une brosse douce<br>Ne pas plier ou écraser",
    artisan: "Hassan Ameziane",
  },
  {
    id: 3,
    name: "Pochette Brodée à la Main",
    price: 62,
    images: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
    ],
    category: "Sacs",
    description:
      "Cette pochette brodée à la main présente des motifs traditionnels berbères réalisés avec des fils colorés sur une base de tissu robuste.",
    details:
      "Dimensions: 25 x 15 cm<br>Matériau: Coton et fils de soie<br>Fermeture éclair",
    care: "Nettoyage délicat à la main",
    artisan: "Aisha Tazi",
  },
  {
    id: 6,
    name: "Panier de Marché Traditionnel",
    price: 68,
    images: [
      "https://images.unsplash.com/photo-1532086853747-99450c17fa2e?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
    ],
    category: "Sacs",
    description:
      "Ce panier de marché traditionnel est parfait pour les courses quotidiennes, alliant fonctionnalité et esthétique artisanale.",
    details:
      "Dimensions: 40 x 30 x 20 cm<br>Matériau: Osier et cuir<br>Poignées en cuir véritable",
    care: "Nettoyer avec un chiffon humide<br>Sécher à l'air libre",
    artisan: "Youssef Benali",
  },
];

type EventType = CustomEvent<{
  message: string;
  type: string;
}>;

const ProductDetail = () => {
  const { dispatch } = useCart();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  const handleAddToCart = () => {
    if (!product || quantity < 1) return;

    // 1. Lecture du panier actuel (array d'items)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cart: any[] = [];
    try {
      const raw = localStorage.getItem("cart");
      if (raw) {
        // Supporte les deux formats (array ou {items: [...]})
        const parsed = JSON.parse(raw);
        cart = Array.isArray(parsed) ? parsed : parsed.items || [];
      }
    } catch {
      // Si parsing échoue, on repart sur un panier vide
      cart = [];
    }

    // 2. Ajout ou incrémentation de l'article
    const existingIndex = cart.findIndex((item) => item.id === product.id);
    if (existingIndex !== -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({ ...product, quantity });
    }

    // 3. Tentative de sauvegarde dans le localStorage
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch (e) {
      // Fallback mémoire globale (non persistant, mais évite la perte immédiate)
      // window.__cartFallback = cart;
      // Affiche un message d'erreur mais continue la logique
      const event: EventType = new CustomEvent("cart-notification", {
        detail: {
          message: "Stockage local indisponible, panier temporaire.",
          type: "error",
        },
      });
      window.dispatchEvent(event);
    }

    // 4. Dispatch context pour synchro UI globale
    dispatch({ type: "ADD_ITEM", payload: product, quantity });

    // 5. Feedback utilisateur
    const event = new CustomEvent("cart-notification", {
      detail: {
        message: `${quantity} × ${product.name} ajouté au panier`,
        type: "success",
      },
    });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    // Find the product with the matching id
    const foundProduct: Product = products.find(
      (p) => p.id === parseInt(id || "0")
    );
    setProduct(foundProduct);

    // Get related products
    if (foundProduct && foundProduct.related) {
      const related = products.filter((p) =>
        foundProduct.related.includes(p.id)
      );
      setRelatedProducts(related);
    }
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-serif">Produit non trouvé</h2>
          <p className="mt-4 mb-8 text-stone-600">
            Le produit que vous recherchez n'existe pas.
          </p>
          <Link to="/products">
            <Button className="bg-olive-700 hover:bg-olive-800">
              Retour aux produits
            </Button>
          </Link>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 py-4">
        <div className="text-sm text-stone-500">
          <Link to="/" className="hover:text-olive-700">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-olive-700">
            Boutique
          </Link>
          <span className="mx-2">/</span>
          <span className="text-stone-700">{product.name}</span>
        </div>
      </div>

      {/* Product Section */}
      <section className="container mx-auto px-4 py-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <div className="aspect-ratio aspect-w-1 aspect-h-1 mb-4 overflow-hidden rounded-lg">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="object-cover w-full h-full"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image: string, idx: number) => (
                  <div
                    key={idx}
                    className={`aspect-ratio aspect-w-1 aspect-h-1 rounded-md overflow-hidden cursor-pointer border-2 
                      ${
                        selectedImage === idx
                          ? "border-olive-500"
                          : "border-transparent"
                      }`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img
                      src={image}
                      alt={`${product.name} - vue ${idx + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-2">
              <Badge className="bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">
                {product.category}
              </Badge>
              {product.new && (
                <Badge className="ml-2 bg-olive-500 text-white border-none">
                  Nouveau
                </Badge>
              )}
            </div>

            <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-2">
              {product.name}
            </h1>

            <div className="text-2xl font-medium text-olive-700 mb-6">
              {product.price} €
            </div>

            <p className="text-stone-600 mb-8">{product.description}</p>

            {/* Artisan Information */}
            <div className="bg-beige-50 p-4 rounded-lg mb-8">
              <div className="flex items-center mb-2">
                <Leaf className="h-5 w-5 text-olive-600 mr-2" />
                <h3 className="font-medium">
                  Fait à la main par {product.artisan}
                </h3>
              </div>
              {product.artisanStory && (
                <p className="text-sm text-stone-600">{product.artisanStory}</p>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Quantité
              </label>
              <div className="flex">
                <button
                  className="border border-stone-300 rounded-l-md px-3 py-2 hover:bg-stone-50"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <input
                  type="text"
                  value={quantity}
                  readOnly
                  className="border-t border-b border-stone-300 px-4 py-2 w-16 text-center focus:outline-none"
                />
                <button
                  className="border border-stone-300 rounded-r-md px-3 py-2 hover:bg-stone-50"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              className="w-full mb-4 bg-olive-700 hover:bg-olive-800 text-white font-medium py-6"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Ajouter au panier
            </Button>

            {/* Product Tabs */}
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
                    __html: product.details.replace(
                      /<br>/g,
                      '<br class="block mb-2">'
                    ),
                  }}
                />
              </TabsContent>
              <TabsContent value="dimensions" className="mt-4">
                <div className="text-stone-600 text-sm">
                  Veuillez consulter les informations détaillées pour les
                  dimensions spécifiques de ce produit.
                </div>
              </TabsContent>
              <TabsContent value="care" className="mt-4">
                <div
                  className="text-stone-600 text-sm space-y-2"
                  dangerouslySetInnerHTML={{
                    __html: product.care.replace(
                      /<br>/g,
                      '<br class="block mb-2">'
                    ),
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="bg-beige-50 py-16">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-8">
              <h2 className="font-serif text-2xl md:text-3xl text-stone-800">
                Vous pourriez aussi aimer
              </h2>
              <Link
                to="/products"
                className="hidden md:flex items-center text-olive-700 hover:text-olive-900 transition-colors"
              >
                Voir tout <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {relatedProducts.map((product) => (
                <Link
                  to={`/products/${product.id}`}
                  key={product.id}
                  className="group"
                >
                  <Card className="border-none shadow-sm overflow-hidden hover-scale">
                    <div className="aspect-ratio aspect-w-1 aspect-h-1 relative overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="text-xs text-stone-500 mb-1">
                        {product.category}
                      </div>
                      <h3 className="font-medium text-stone-800 mb-1">
                        {product.name}
                      </h3>
                      <p className="text-olive-700 font-medium">
                        {product.price} €
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PageFooter />
    </div>
  );
};

export default ProductDetail;
