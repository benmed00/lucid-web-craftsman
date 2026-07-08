import { Link } from 'react-router-dom';
import { Sun, Palmtree, Umbrella, ArrowRight } from 'lucide-react';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';

const StyleGuideHats = () => {
  const url = 'https://rif-raw-straw.lovable.app/blog/straw-hat-style-guide';

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline:
      'Straw Hat Style Guide — How to Wear a Straw Cowboy Hat, Bucket Hat & Wide-Brim',
    description:
      'A wearable style guide for straw hats: outfit rules for the straw cowboy hat, straw bucket hat, and wide-brim fedora — from beach and festival to city looks.',
    author: { '@type': 'Organization', name: 'Rif Elegance' },
    publisher: { '@type': 'Organization', name: 'Rif Elegance' },
    mainEntityOfPage: url,
    image: 'https://rif-raw-straw.lovable.app/assets/images/home_page_image.webp',
    inLanguage: 'en',
    datePublished: '2026-07-07',
    dateModified: '2026-07-07',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do you style a straw cowboy hat without looking costumey?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pair a natural straw cowboy hat with modern staples — a plain white tee, straight-leg denim, and leather boots or minimalist sandals. Skip fringe and bandanas; let the hat carry the western reference on its own. A curved brim reads more contemporary than a flat pinched crown.',
        },
      },
      {
        '@type': 'Question',
        name: 'What outfit goes with a straw bucket hat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A straw bucket hat works best with relaxed summer pieces: a linen shirt open over a tank, wide-leg shorts or a bias-cut skirt, and canvas sneakers or slides. Keep colours tonal (sand, cream, off-white) so the woven texture reads as the accent.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is a straw cowboy hat or a straw bucket hat better for the beach?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Both work at the beach, but for different reasons. A straw cowboy hat gives more sun coverage across the neck and shoulders thanks to its wider brim, so it suits long days outdoors. A straw bucket hat is lighter, packable, and easier to pull down over wet hair — ideal between swims.',
        },
      },
      {
        '@type': 'Question',
        name: 'What face shape suits a wide-brim straw hat?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Wide-brim straw hats (Panama, fedora, cowboy) flatter round and heart-shaped faces by adding vertical lines and softening the jaw. Oval faces suit almost any crown height. If you have a smaller frame, scale the brim down to 7–9 cm so the hat does not overwhelm the silhouette.',
        },
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEOHelmet
        title="Straw Hat Style Guide — Cowboy, Bucket & Wide-Brim | Rif Elegance"
        description="How to style a straw cowboy hat, straw bucket hat, and wide-brim fedora — outfit rules, face-shape tips, and beach-to-city looks with handmade straw hats."
        keywords={[
          'straw hat',
          'straw cowboy hat',
          'straw bucket hat',
          'how to style a straw hat',
          'wide brim straw hat',
          'panama hat outfit',
          'handmade straw hat',
        ]}
        url="/blog/straw-hat-style-guide"
        image="/assets/images/home_page_image.webp"
        type="article"
        article={{
          author: 'Rif Elegance',
          publishedTime: '2026-07-07',
          modifiedTime: '2026-07-07',
          section: 'Style',
          tags: ['straw hat', 'cowboy hat', 'bucket hat', 'styling', 'summer'],
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span aria-hidden="true"> / </span>
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">Straw Hat Style Guide</span>
        </nav>

        <header className="mb-10">
          <p className="text-sm uppercase tracking-widest text-primary mb-3">
            Style Guide
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            The Straw Hat Style Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Three shapes, three edits — how to wear the straw cowboy hat, the
            straw bucket hat and the wide-brim fedora without looking
            costumey.
          </p>
        </header>

        <section aria-labelledby="why" className="prose prose-stone max-w-none mb-12">
          <h2 id="why" className="font-serif text-2xl text-foreground mb-3">
            Why the straw hat is the summer piece worth investing in
          </h2>
          <p className="text-foreground/90">
            A handmade straw hat is functional first — sun protection, breathable
            fibre, and the kind of shape that only holds up when it is woven by
            hand. Choose the crown that fits your face, and the same hat can
            move from a beach walk to a city café without losing character.
          </p>
        </section>

        <section aria-labelledby="cowboy" className="mb-12">
          <h2 id="cowboy" className="flex items-center gap-3 font-serif text-2xl text-foreground mb-4">
            <Sun className="h-6 w-6 text-primary" aria-hidden="true" />
            1. The straw cowboy hat
          </h2>
          <ul className="space-y-2 text-foreground/90 list-disc pl-6">
            <li>
              <strong>Hat:</strong> natural-toned straw cowboy hat with a soft
              curved brim (avoid stiff flat brims).
            </li>
            <li>
              <strong>Outfit:</strong> plain white tee, straight-leg denim, or a
              simple slip dress in ecru.
            </li>
            <li>
              <strong>Shoes:</strong> tan leather boots, minimalist sandals, or
              cognac loafers.
            </li>
            <li>
              <strong>Accents:</strong> one gold cuff, small hoop earrings — skip
              fringe, conchos and bandanas.
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Styling rule: modern basics keep a cowboy hat contemporary. Let the
            hat be the only western reference in the outfit.
          </p>
        </section>

        <section aria-labelledby="bucket" className="mb-12">
          <h2 id="bucket" className="flex items-center gap-3 font-serif text-2xl text-foreground mb-4">
            <Palmtree className="h-6 w-6 text-primary" aria-hidden="true" />
            2. The straw bucket hat
          </h2>
          <ul className="space-y-2 text-foreground/90 list-disc pl-6">
            <li>
              <strong>Hat:</strong> softly structured straw bucket hat, mid-depth
              crown so it sits above the brows.
            </li>
            <li>
              <strong>Outfit:</strong> linen shirt over a fitted tank, wide-leg
              shorts or a bias-cut midi skirt.
            </li>
            <li>
              <strong>Shoes:</strong> canvas sneakers, leather slides or flat
              espadrilles.
            </li>
            <li>
              <strong>Accents:</strong> stacked thin bracelets, tortoiseshell
              sunglasses, a raffia crossbody.
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Styling rule: keep the palette tonal — sand, cream, off-white — so
            the woven texture reads as the accent, not the noise.
          </p>
        </section>

        <section aria-labelledby="widebrim" className="mb-12">
          <h2 id="widebrim" className="flex items-center gap-3 font-serif text-2xl text-foreground mb-4">
            <Umbrella className="h-6 w-6 text-primary" aria-hidden="true" />
            3. The wide-brim fedora
          </h2>
          <ul className="space-y-2 text-foreground/90 list-disc pl-6">
            <li>
              <strong>Hat:</strong> fine-straw wide-brim fedora with a leather
              or ribbon band.
            </li>
            <li>
              <strong>Outfit:</strong> long linen dress, high-waisted trousers
              with a silk cami, or a two-piece linen set.
            </li>
            <li>
              <strong>Shoes:</strong> low block-heel mules or leather sandals.
            </li>
            <li>
              <strong>Accents:</strong> one architectural gold earring, a
              structured raffia tote.
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Styling rule: length talks to length. A wide brim balances flowing
            fabrics and long silhouettes.
          </p>
        </section>

        <section aria-labelledby="face" className="mb-12">
          <h2 id="face" className="font-serif text-2xl text-foreground mb-3">
            How to pick a straw hat for your face shape
          </h2>
          <ul className="space-y-2 text-foreground/90 list-disc pl-6">
            <li>
              <strong>Round or heart-shaped face:</strong> wide brims (fedora,
              cowboy) add height and soften the jawline.
            </li>
            <li>
              <strong>Oval face:</strong> almost every crown works — choose by
              outfit rather than proportion.
            </li>
            <li>
              <strong>Square face:</strong> curved brims and softer bucket
              shapes balance stronger angles.
            </li>
            <li>
              <strong>Petite frame:</strong> keep brims between 7 and 9 cm so
              the hat does not overwhelm the silhouette.
            </li>
          </ul>
        </section>

        <section aria-labelledby="rules" className="mb-12">
          <h2 id="rules" className="font-serif text-2xl text-foreground mb-3">
            Three universal styling rules
          </h2>
          <ol className="space-y-2 text-foreground/90 list-decimal pl-6">
            <li>Match the crown to the outfit's weight — soft crowns with soft fabrics, structured crowns with tailoring.</li>
            <li>Keep the palette to three tones and let the natural weave be the fourth.</li>
            <li>Choose a hat that is handwoven — machine-pressed straw loses shape after one season.</li>
          </ol>
        </section>

        <section
          aria-labelledby="cta"
          className="rounded-lg border border-border bg-secondary p-6 mb-12"
        >
          <h2 id="cta" className="font-serif text-2xl text-foreground mb-2">
            Shop the handwoven hat collection
          </h2>
          <p className="text-muted-foreground mb-4">
            Every straw hat is handwoven by an artisan in the Rif mountains —
            limited stock, signed pieces.
          </p>
          <Link
            to="/products?category=Chapeaux"
            aria-label="Browse the handwoven straw hat collection"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-primary-foreground hover:bg-primary/90 min-h-11"
          >
            Browse the hat collection
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <aside aria-labelledby="related" className="border-t border-border pt-6">
          <h2 id="related" className="font-serif text-xl text-foreground mb-3">
            Related reads
          </h2>
          <ul className="space-y-2">
            <li>
              <Link to="/blog/how-to-style-straw-bags" className="text-primary hover:underline">
                How to style handmade straw bags →
              </Link>
            </li>
            <li>
              <Link to="/artisans" className="text-primary hover:underline">
                Meet the artisans of the Rif →
              </Link>
            </li>
            <li>
              <Link to="/blog" className="text-primary hover:underline">
                More from the journal →
              </Link>
            </li>
          </ul>
        </aside>
      </main>

      <PageFooter />
    </div>
  );
};

export default StyleGuideHats;
