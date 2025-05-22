// File_name: src/data/products.ts

import { Product } from "../shared/interfaces/Iproduct.interface";

export const products: Product[] = [
  {
    id: 1,
    name: "Sac à Main Tissé Traditionnel",
    price: 89,
    images: [
      `${import.meta.env.BASE_URL}assets/images/sacs/sac_traditionnel.jpg`,
      `${import.meta.env.BASE_URL}assets/images/sacs/sac_traditionnel_vue1.jpg`,
      `${import.meta.env.BASE_URL}assets/images/sacs/sac_traditionnel_vue2.jpg`,
      `${import.meta.env.BASE_URL}assets/images/sacs/sac_traditionnel_vue3.jpg`,
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
      `${import.meta.env.BASE_URL}assets/images/chapeau_de_paille_berbere_2.jpg`,
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
    id: 4,
    name: "Cabas en Fibres Naturelles",
    price: 75,
    images: [
      "https://images.unsplash.com/photo-1578237493287-8d4d2b03591a?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
    ],
    category: "Sacs",
    description:
      "Ce cabas spacieux est confectionné à partir de fibres végétales locales. Idéal pour les courses ou comme sac de plage.",
    details:
      "Dimensions: 45 x 35 x 15 cm<br>Matériau: Fibres naturelles tressées<br>Poignées renforcées",
    care: "Nettoyer avec un chiffon légèrement humide<br>Sécher à l'air libre<br>Éviter l'eau salée",
    artisan: "Omar Benali",
  },
  {
    id: 5,
    name: "Chapeau de Soleil Tressé",
    price: 52,
    images: [
      "https://images.unsplash.com/photo-1572307480813-ceb0e59d8325?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
    ],
    category: "Chapeaux",
    description:
      "Chapeau élégant à large bord offrant une protection optimale contre le soleil. Parfait pour les journées d'été.",
    details:
      "Taille unique avec cordon ajustable<br>Matériau: Paille tressée à la main<br>Bord de 10 cm",
    care: "Nettoyer avec une brosse douce<br>Éviter l'eau",
    new: true,
    artisan: "Rachid El Mansouri",
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
