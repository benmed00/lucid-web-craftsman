// src\data\products.ts

import { IBlogPost } from "@/shared/interfaces/IBlogPost";


export const blogPosts: IBlogPost[] = [
  {
    id: 1,
    title: "L'art du tissage traditionnel dans les montagnes du Rif",
    excerpt:
      "Découvrez comment les artisans transmettent leurs techniques de génération en génération tout en adaptant leur savoir-faire aux tendances modernes.",
    content: "<p>Dans les montagnes du Rif, l'art du tissage est une tradition ancestrale qui se transmet de génération en génération. Les artisans locaux utilisent des techniques traditionnelles tout en s'adaptant aux tendances modernes.</p>",
    image: "/blog/tissage.jpg",
    date: "14 Mai 2025",
    author: "Layla Nakouri",
    category: "Artisanat",
    featured: true,
  },
  {
    id: 2,
    title: "Matériaux naturels : la beauté des fibres végétales",
    excerpt:
      "Quels sont les matériaux utilisés dans la confection de nos sacs et chapeaux? Une exploration des fibres locales et durables que nous privilégions.",
    content: "<p>Nos artisans utilisent uniquement des fibres naturelles pour créer des produits durables et beaux. Ils travaillent avec des matières comme le coton biologique et les fibres de lin pour créer des produits de qualité.</p>",
    image: "/blog/fibre_vegetal.jpg",
    date: "28 Avril 2025",
    author: "Thomas Dubois",
    category: "Durabilité",
  },
  {
    id: 3,
    title: "Rencontre avec Amina, maître artisane depuis 40 ans",
    excerpt:
      "Le portrait touchant d'une des plus anciennes artisanes de notre coopérative, qui perpétue un savoir-faire ancestral avec passion et dévouement.",
    content: "<p>Amina a dédié sa vie à l'artisanat, transmettant son savoir-faire à travers les générations. Son dévouement et sa passion sont une source d'inspiration pour tous les artisans de la région.</p>",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "10 Avril 2025",
    author: "Sophie Laurent",
    category: "Portraits",
    featured: true,
  },
  {
    id: 4,
    title: "Les symboles berbères dans nos créations",
    excerpt:
      "Chaque motif raconte une histoire. Découvrez la signification des symboles ancestraux que vous retrouvez sur nos créations artisanales.",
    content: "<p>Les symboles berbères sont une partie importante de notre héritage culturel. Chaque motif a une signification particulière et raconte une histoire unique de notre région.</p>",
    image: "/blog/symboles_berberes.webp",
    date: "2 Avril 2025",
    author: "Mehdi Alaoui",
    category: "Culture",
  },
  {
    id: 5,
    title: "Comment entretenir votre sac en fibres naturelles",
    excerpt:
      "Nos conseils d'experts pour préserver la beauté et prolonger la durée de vie de vos accessoires artisanaux en fibres naturelles.",
    content: "<p>Pour prendre soin de votre sac en fibres naturelles, voici nos conseils d'experts : nettoyez-le régulièrement avec un chiffon humide, évitez les expositions prolongées au soleil et rangez-le dans un endroit sec.</p>",
    image:
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "15 Mars 2025",
    author: "Claire Dubois",
    category: "Conseils",
  },
  {
    id: 6,
    title: "Notre engagement pour un commerce équitable",
    excerpt:
      "Comment nous assurons des conditions de travail justes et une rémunération équitable pour tous les artisans qui collaborent avec notre marque.",
    content: "<p>Nous sommes engagés dans un commerce équitable, assurant des conditions de travail justes et une rémunération équitable pour tous les artisans qui collaborent avec nous. C'est notre façon de contribuer à un monde meilleur.</p>",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80",
    date: "28 Février 2025",
    author: "Jean Martin",
    category: "Éthique",
  },
];

export default blogPosts;
