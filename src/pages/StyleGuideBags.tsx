import { Link } from 'react-router-dom';
import { Sun, Building2, Moon, ArrowRight } from 'lucide-react';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';

const StyleGuideBags = () => {
  const url = 'https://rif-raw-straw.lovable.app/blog/how-to-style-straw-bags';

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline:
      'How to Style Handmade Straw Bags for Any Occasion — Beach, City & Evening',
    description:
      'Outfit pairings and styling rules for handmade straw bags: beach tote looks, city-day silhouettes and evening edits with raffia and doum bags from the artisans of the Rif.',
    author: { '@type': 'Organization', name: 'Rif Elegance' },
    publisher: { '@type': 'Organization', name: 'Rif Elegance' },
    mainEntityOfPage: url,
    image: 'https://rif-raw-straw.lovable.app/assets/images/home_page_image.webp',
    inLanguage: 'en',
    datePublished: '2026-06-17',
    dateModified: '2026-06-17',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What outfit works best with a straw beach bag?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pair an oversized straw beach bag with a linen midi dress in white, ecru or sand, flat leather sandals and a wide-brim straw hat. Keep jewellery minimal — one gold cuff or a single shell pendant — so the woven texture of the bag stays the focal point.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I wear a straw tote bag in the city?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. A structured straw tote bag works for the city when paired with tailored trousers, a crisp poplin shirt and loafers or low block heels. Choose a tote with leather handles and a closed top to keep the look polished from morning meetings to lunch.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are straw bags appropriate for evening wear?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A small raffia clutch or mini straw bag is a beautiful evening alternative to leather, especially in summer. Pair with a slip dress in silk or satin, gold-toned heels and warm metallic jewellery to elevate the natural fibres.',
        },
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEOHelmet
        title="How to Style Handmade Straw Bags for Any Occasion | Rif Elegance"
        description="A wearable styling guide for handmade straw bags — beach tote outfits, city looks and evening pairings with raffia and doum bags from the artisans of the Rif."
        keywords={[
          'straw bag',
          'straw beach bag',
          'straw tote bag',
          'how to style a straw bag',
          'raffia bag outfit',
          'handmade straw bag',
          'summer bag outfit',
        ]}
        url="/blog/how-to-style-straw-bags"
        image="/assets/images/home_page_image.webp"
        type="article"
        article={{
          author: 'Rif Elegance',
          publishedTime: '2026-06-17',
          modifiedTime: '2026-06-17',
          section: 'Style',
          tags: ['straw bag', 'styling', 'summer', 'raffia'],
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
          <span aria-current="page">How to Style Straw Bags</span>
        </nav>

        <header className="mb-10">
          <p className="text-sm uppercase tracking-widest text-primary mb-3">
            Style Guide
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            How to Style Handmade Straw Bags for Any Occasion
          </h1>
          <p className="text-lg text-muted-foreground">
            Three wearable edits — beach, city and evening — built around the
            handwoven doum and raffia bags of the Rif artisans.
          </p>
        </header>

        <section aria-labelledby="why-straw" className="prose prose-stone max-w-none mb-12">
          <h2 id="why-straw" className="font-serif text-2xl text-foreground mb-3">
            Why straw bags belong in every modern wardrobe
          </h2>
          <p className="text-foreground/90">
            A handmade straw bag is the rare accessory that softens a tailored
            look and sharpens a casual one. Woven by hand from doum palm or
            raffia, each piece carries the warmth and irregularity of natural
            fibre — a texture that flatters linen, denim, silk and even sequins.
          </p>
        </section>

        <section aria-labelledby="beach" className="mb-12">
          <h2 id="beach" className="flex items-center gap-3 font-serif text-2xl text-foreground mb-4">
            <Sun className="h-6 w-6 text-primary" aria-hidden="true" />
            1. The beach edit — straw beach bag
          </h2>
          <ul className="space-y-2 text-foreground/90 list-disc pl-6">
            <li>
              <strong>Bag:</strong> oversized doum tote with leather handles and
              an open top for towels and SPF.
            </li>
            <li>
              <strong>Dress:</strong> linen midi in ecru, white or sand.
            </li>
            <li>
              <strong>Shoes:</strong> flat leather slides or espadrilles.
            </li>
            <li>
              <strong>Accents:</strong> wide-brim straw hat, a single gold cuff,
              tortoiseshell sunglasses.
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Styling rule: let the bag breathe. One tonal outfit, one texture
            statement.
          </p>
        </section>

        <section aria-labelledby="city" className="mb-12">
          <h2 id="city" className="flex items-center gap-3 font-serif text-2xl text-foreground mb-4">
            <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
            2. The city edit — structured straw tote
          </h2>
          <ul className="space-y-2 text-foreground/90 list-disc pl-6">
            <li>
              <strong>Bag:</strong> structured straw tote with a closed flap and
              leather trims.
            </li>
            <li>
              <strong>Outfit:</strong> high-waisted tailored trousers, crisp
              poplin shirt tucked in.
            </li>
            <li>
              <strong>Shoes:</strong> loafers or low block-heel mules.
            </li>
            <li>
              <strong>Accents:</strong> gold hoop earrings, a silk scarf knotted
              on the handle.
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Styling rule: balance rusticity with one tailored element — sharp
            trousers or a clean shirt collar.
          </p>
        </section>

        <section aria-labelledby="evening" className="mb-12">
          <h2 id="evening" className="flex items-center gap-3 font-serif text-2xl text-foreground mb-4">
            <Moon className="h-6 w-6 text-primary" aria-hidden="true" />
            3. The evening edit — raffia clutch
          </h2>
          <ul className="space-y-2 text-foreground/90 list-disc pl-6">
            <li>
              <strong>Bag:</strong> small raffia clutch or mini top-handle.
            </li>
            <li>
              <strong>Outfit:</strong> silk or satin slip dress in jewel tones
              or champagne.
            </li>
            <li>
              <strong>Shoes:</strong> gold-toned heeled sandals.
            </li>
            <li>
              <strong>Accents:</strong> stacked gold rings, a warm amber
              fragrance.
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Styling rule: contrast matters — pair the matte natural weave with
            shine (satin, gold, glass).
          </p>
        </section>

        <section aria-labelledby="rules" className="mb-12">
          <h2 id="rules" className="font-serif text-2xl text-foreground mb-3">
            Three universal styling rules
          </h2>
          <ol className="space-y-2 text-foreground/90 list-decimal pl-6">
            <li>Keep the palette to three tones — let the weave be the fourth.</li>
            <li>Match metals to the leather trims of the bag (gold with cognac, silver with black).</li>
            <li>Scale the bag to the silhouette: oversized with flowing fabrics, structured with tailoring.</li>
          </ol>
        </section>

        <section
          aria-labelledby="cta"
          className="rounded-lg border border-border bg-secondary p-6 mb-12"
        >
          <h2 id="cta" className="font-serif text-2xl text-foreground mb-2">
            Shop the handwoven collection
          </h2>
          <p className="text-muted-foreground mb-4">
            Every bag is handwoven by an artisan in the Rif mountains —
            limited stock, signed pieces.
          </p>
          <Link
            to="/products"
            aria-label="Browse the handwoven straw bag collection"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-primary-foreground hover:bg-primary/90 min-h-11"
          >
            Browse the collection
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <aside aria-labelledby="related" className="border-t border-border pt-6">
          <h2 id="related" className="font-serif text-xl text-foreground mb-3">
            Related reads
          </h2>
          <ul className="space-y-2">
            <li>
              <Link to="/care-guide/straw-bags" className="text-primary hover:underline">
                How to care for a handmade straw bag →
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

export default StyleGuideBags;
