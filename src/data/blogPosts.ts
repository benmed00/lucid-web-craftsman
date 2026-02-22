import { BlogPost } from '../shared/interfaces/IBlogPost.interface';

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "L'art du tissage traditionnel dans les montagnes du Rif",
    excerpt:
      'Découvrez comment les artisans transmettent leurs techniques de génération en génération tout en adaptant leur savoir-faire aux tendances modernes.',
    image: '/assets/images/blog/tissage.jpg',
    date: '14 Mai 2025',
    author: 'Layla Nakouri',
    category: 'Artisanat',
    featured: true,
  },
  {
    id: 2,
    title: 'Matériaux naturels : la beauté des fibres végétales',
    excerpt:
      'Quels sont les matériaux utilisés dans la confection de nos sacs et chapeaux? Une exploration des fibres locales et durables que nous privilégions.',
    image: '/assets/images/blog/fibre_vegetal.jpg',
    date: '28 Avril 2025',
    author: 'Thomas Dubois',
    category: 'Durabilité',
  },
  {
    id: 3,
    title: 'Rencontre avec Amina, maître artisane depuis 40 ans',
    excerpt:
      "Le portrait touchant d'une des plus anciennes artisanes de notre coopérative, qui perpétue un savoir-faire ancestral avec passion et dévouement.",
    image:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80',
    date: '10 Avril 2025',
    author: 'Sophie Laurent',
    category: 'Portraits',
    featured: true,
  },
  {
    id: 4,
    title: 'Les symboles berbères dans nos créations',
    excerpt:
      'Chaque motif raconte une histoire. Découvrez la signification des symboles ancestraux que vous retrouvez sur nos créations artisanales.',
    image: '/assets/images/blog/symboles_berberes.webp',
    date: '2 Avril 2025',
    author: 'Mehdi Alaoui',
    category: 'Culture',
  },
  {
    id: 5,
    title: 'Comment entretenir votre sac en fibres naturelles',
    excerpt:
      "Nos conseils d'experts pour préserver la beauté et prolonger la durée de vie de vos accessoires artisanaux en fibres naturelles.",
    image:
      'https://images.unsplash.com/photo-1610701596007-11502861dcfa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80',
    date: '15 Mars 2025',
    author: 'Claire Dubois',
    category: 'Conseils',
  },
  {
    id: 6,
    title: 'Notre engagement pour un commerce équitable',
    excerpt:
      'Comment nous assurons des conditions de travail justes et une rémunération équitable pour tous les artisans qui collaborent avec notre marque.',
    image:
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80',
    date: '28 Février 2025',
    author: 'Jean Martin',
    category: 'Éthique',
  },
];

export default blogPosts;
