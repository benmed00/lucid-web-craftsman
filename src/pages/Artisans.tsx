import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import PageFooter from '@/components/PageFooter';
import Navigation from '@/components/Navigation';

const PROCESS_STEPS = [
  {
    title: 'Harvesting',
    description:
      'Raw straw is carefully selected and harvested by hand from the Rif mountains during peak season.',
    image:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Weaving',
    description:
      'Each strand is braided using techniques passed down through generations of Rifian women.',
    image:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Shaping',
    description:
      'Artisans mold every piece by hand, giving each hat its unique silhouette and character.',
    image:
      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Finishing',
    description:
      'Final touches — trimming, steaming, and quality checks — ensure every piece meets our standards.',
    image:
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=600&q=80',
  },
];

const ARTISANS = [
  {
    name: 'Fatima Benmoussa',
    region: 'Chefchaouen, Rif',
    description:
      'A master weaver with over 25 years of experience, Fatima learned the craft from her grandmother and now leads a collective of 12 women artisans.',
    image:
      'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Hassan El Amrani',
    region: 'Ouezzane, Rif',
    description:
      'Hassan specializes in structural shaping techniques unique to the northern Rif region, creating bold silhouettes from natural straw.',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Aicha Ouazzani',
    region: 'Taounate, Rif',
    description:
      'Known for her intricate braiding patterns, Aicha combines traditional Amazigh motifs with contemporary fashion aesthetics.',
    image:
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=500&q=80',
  },
];

const ArtisansPage = () => {
  const { t } = useTranslation(['pages', 'common']);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO SECTION */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1920&q=80"
            alt="Artisan hands weaving straw in the Rif mountains"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-bold tracking-wide leading-tight mb-6">
            Crafted by Hands,
            <br />
            Rooted in Heritage
          </h1>
          <p className="text-lg md:text-xl text-white/80 font-light tracking-wider max-w-2xl mx-auto">
            Discover the artisans behind Rif Raw Straw
          </p>
        </div>
      </section>

      {/* STORY SECTION — SPLIT LAYOUT */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center max-w-6xl mx-auto">
            <div className="overflow-hidden rounded-sm">
              <img
                src="https://images.unsplash.com/photo-1571115764595-644a1f56a55c?auto=format&fit=crop&w=800&q=80"
                alt="Close-up of hand-woven straw texture"
                className="w-full h-[500px] object-cover hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
            </div>
            <div className="space-y-8">
              <h2 className="font-serif text-3xl md:text-5xl text-foreground font-semibold leading-tight tracking-wide">
                A Tradition
                <br />
                Worth Preserving
              </h2>
              <div className="w-16 h-px bg-primary" />
              <p className="text-muted-foreground text-lg leading-relaxed">
                In the mountains of Morocco's Rif region, a centuries-old craft
                lives on through the hands of skilled artisans. Each piece of
                straw is harvested, prepared, and woven using techniques passed
                down through generations of Amazigh women.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                At Rif Raw Straw, we don't just sell hats — we carry forward a
                living heritage. Every purchase directly supports these artisan
                families and helps preserve a cultural tradition at risk of
                disappearing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ARTISANS GRID */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground font-semibold tracking-wide mb-4">
              Meet Our Artisans
            </h2>
            <p className="text-muted-foreground text-lg">
              The talented hands shaping every piece in our collection.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {ARTISANS.map((artisan, i) => (
              <div
                key={artisan.name}
                className="group bg-card rounded-sm overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-500"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="overflow-hidden h-80">
                  <img
                    src={artisan.image}
                    alt={`Portrait of ${artisan.name}, artisan from ${artisan.region}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-serif text-xl text-foreground font-semibold">
                    {artisan.name}
                  </h3>
                  <p className="text-sm text-primary font-medium tracking-wider uppercase">
                    {artisan.region}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {artisan.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED ARTISAN */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-6xl mx-auto overflow-hidden rounded-sm shadow-lg">
            <div className="h-[400px] lg:h-auto">
              <img
                src="https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=800&q=80"
                alt="Fatima Benmoussa, master weaver"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="bg-card p-10 md:p-16 flex flex-col justify-center space-y-6">
              <p className="text-xs text-primary font-semibold tracking-[0.2em] uppercase">
                Featured Artisan
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-foreground font-semibold leading-tight">
                Fatima Benmoussa
              </h2>
              <div className="w-12 h-px bg-primary" />
              <p className="text-muted-foreground text-lg leading-relaxed italic">
                "When I weave, I feel connected to my grandmother, to her
                grandmother, and to every woman in our village who has shaped
                straw with her hands. This is not just work — it is who we are."
              </p>
              <p className="text-muted-foreground leading-relaxed">
                With over 25 years of mastery, Fatima leads a collective of 12
                women artisans in Chefchaouen. Her pieces are known for their
                exceptional precision and the distinctive patterns unique to her
                family's tradition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS SECTION */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground font-semibold tracking-wide mb-4">
              The Making Process
            </h2>
            <p className="text-muted-foreground text-lg">
              From raw material to finished masterpiece — every step done by
              hand.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.title} className="text-center group">
                <div className="relative mb-6 overflow-hidden rounded-sm aspect-[4/5]">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-serif text-lg text-foreground font-semibold mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING SECTION */}
      <section className="py-24 md:py-32" style={{ backgroundColor: '#FAF9F6' }}>
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="w-12 h-px bg-primary mx-auto mb-8" />
          <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground/90 font-medium leading-relaxed tracking-wide italic">
            "Every piece carries a story,
            <br />a culture, a hand."
          </p>
          <div className="w-12 h-px bg-primary mx-auto mt-8" />
        </div>
      </section>

      <PageFooter />
    </div>
  );
};

export default ArtisansPage;
