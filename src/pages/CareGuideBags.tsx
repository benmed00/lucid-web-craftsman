import { Link } from 'react-router-dom';
import { Wrench, ArrowRight } from 'lucide-react';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';
import { trackContact } from '@/lib/tracking/pixels';

const CareGuideBags = () => {
  const url = 'https://rif-raw-straw.lovable.app/care-guide/straw-bags';

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline:
      'How to Care for a Handmade Straw Bag — Doum, Raffia & Palm Fibre Guide',
    description:
      'Expert preservation guide for handmade straw bags woven from doum, raffia and natural palm fibres — cleaning, reshaping, waterproofing, repair and seasonal storage from the artisans of the Rif.',
    author: { '@type': 'Organization', name: 'Rif Elegance' },
    publisher: { '@type': 'Organization', name: 'Rif Elegance' },
    mainEntityOfPage: url,
    inLanguage: 'en',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I clean a handmade straw bag without ruining the weave?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Empty the bag, brush the outside with a soft-bristle brush in the direction of the weave, then spot-clean stains with a barely damp white cloth and a single drop of pH-neutral soap. Never submerge a straw bag in water — it relaxes the fibres and warps the shape permanently.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can straw bags get wet or be used in the rain?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Light splashes are fine if blotted immediately with a dry cloth, but extended rain exposure softens the weave and can stain the leather trims. For predictable weather, treat the bag once a season with a clear, silicone-free natural-fibre protector spray.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I reshape a crushed or misshapen straw bag?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Stuff the bag firmly with acid-free tissue paper or a clean cotton T-shirt, hold the soft area 20 cm above a kettle for 10–15 seconds to relax the fibres with steam, then re-mould the body with your hands and let it air-dry stuffed for at least 24 hours.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I store a straw bag between seasons?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Stuff the bag lightly with acid-free tissue to hold its shape, slip it inside a cotton dust bag, and store it upright in a cool, dark, dry wardrobe — never in a plastic bag, never in a damp cellar, never compressed under heavier pieces.',
        },
      },
      {
        '@type': 'Question',
        name: 'How long should a handmade straw bag last?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A well-woven doum or raffia bag, cared for with these basic rituals, lasts ten to twenty years of seasonal use. The fibres soften and patinate beautifully over time — that is the mark of an authentic, hand-woven piece.',
        },
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SEOHelmet
        title="How to Care for a Handmade Straw Bag — Doum & Raffia Guide"
        description="Expert preservation guide from Rif artisans: clean, reshape, waterproof, repair and store handmade straw bags woven from doum, raffia and palm fibres."
        keywords={[
          'straw bag care',
          'how to clean a straw bag',
          'handmade straw bags',
          'raffia bag care',
          'doum palm bag',
          'straw bag waterproofing',
          'straw bag storage',
          'Rif artisans',
        ]}
        url="/care-guide/straw-bags"
        type="article"
      />

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="flex-1 container mx-auto px-4 py-16">
        <article className="max-w-3xl mx-auto">
          <header className="mb-10 text-center">
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
              Artisan Care Guide
            </p>
            <h1 className="mb-6">
              How to Care for a Handmade Straw Bag
            </h1>
            <p className="text-body-lg text-muted-foreground leading-relaxed">
              A handmade straw bag — woven from doum palm, raffia or natural
              palm fibre — is built to outlive trends. The Rif artisans who
              hand-knot every basket have preserved theirs for decades. Here
              is exactly how they do it, step by step.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Looking after a hat instead?{' '}
              <Link
                to="/care-guide"
                className="underline text-primary hover:text-primary/80 transition"
              >
                Read the straw hat care guide
              </Link>
              .
            </p>
          </header>

          <nav
            aria-label="Table of contents"
            className="bg-card rounded-lg shadow-elegant p-6 md:p-8 border border-border mb-10"
          >
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
              Table of contents
            </h2>
            <ol className="space-y-2 list-decimal pl-5 marker:text-muted-foreground">
              <li>
                <a href="#fibres" className="underline text-primary hover:text-primary/80 transition">
                  Know your fibre: doum, raffia and palm
                </a>
              </li>
              <li>
                <a href="#clean" className="underline text-primary hover:text-primary/80 transition">
                  How to clean a straw bag
                </a>
              </li>
              <li>
                <a href="#waterproof" className="underline text-primary hover:text-primary/80 transition">
                  Waterproofing and rain protection
                </a>
              </li>
              <li>
                <a href="#reshape" className="underline text-primary hover:text-primary/80 transition">
                  Reshaping a crushed straw bag
                </a>
              </li>
              <li>
                <a href="#repair" className="underline text-primary hover:text-primary/80 transition">
                  Repairing tears, handles and linings
                </a>
              </li>
              <li>
                <a href="#repair-quote" className="underline text-primary hover:text-primary/80 transition">
                  Need a repair? Ask our artisans for a quote
                </a>
              </li>
              <li>
                <a href="#store" className="underline text-primary hover:text-primary/80 transition">
                  How to store a straw bag between seasons
                </a>
              </li>
              <li>
                <a href="#continue-exploring" className="underline text-primary hover:text-primary/80 transition">
                  Continue exploring
                </a>
              </li>
            </ol>
          </nav>

          <section id="fibres" className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">1. Know your fibre: doum, raffia and palm</h2>
            <p className="mb-4 leading-relaxed">
              Care starts with knowing what you are holding. Every fibre we
              weave in the Rif behaves slightly differently — match the
              ritual to the material and your bag will reward you for
              decades.
            </p>
            <ul className="list-disc pl-6 space-y-3 leading-relaxed">
              <li>
                <strong>Doum palm.</strong> Stiff, golden and structural —
                the fibre of choice for tote and bucket shapes. Loves dry
                heat, hates prolonged moisture.
              </li>
              <li>
                <strong>Raffia.</strong> Soft, supple, slightly silky —
                perfect for crocheted clutches and woven shoppers. Needs the
                gentlest touch when wet and the gentlest brush when dry.
              </li>
              <li>
                <strong>Natural palm leaf.</strong> Lighter and more open
                weave — common in beach baskets. Most sensitive to UV
                bleaching, so store it out of direct sunlight.
              </li>
            </ul>
          </section>

          <section id="clean" className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">2. How to clean a straw bag</h2>
            <p className="mb-4 leading-relaxed">
              Routine cleaning of a handmade straw bag is a two-minute
              ritual. The single most damaging mistake is soaking — straw
              is a living fibre and water relaxes the weave permanently.
            </p>
            <ol className="list-decimal pl-6 space-y-3 leading-relaxed">
              <li>
                <strong>Empty and shake.</strong> Turn the bag upside down
                and gently tap the base to release sand, crumbs and dust
                trapped in the weave.
              </li>
              <li>
                <strong>Dry-brush.</strong> With a soft-bristle clothes
                brush or a clean make-up brush, sweep the body in the
                direction of the weave. Brushing against the grain snags
                the fibre.
              </li>
              <li>
                <strong>Spot-clean.</strong> Dampen a white cotton cloth
                with cool water and a single drop of pH-neutral soap (a
                baby shampoo works perfectly). Press — never rub — the
                stain, then dab with a dry cloth to wick the moisture out.
              </li>
              <li>
                <strong>Air-dry stuffed.</strong> Loosely stuff the bag
                with a dry cotton cloth or acid-free tissue and let it air
                in the shade for several hours before using or storing it.
              </li>
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Avoid: washing machines, bleach, alcohol wipes, hairdryers,
              and any prolonged contact with water. They all dissolve the
              natural waxes that protect the fibre and give it its sheen.
            </p>
          </section>

          <section id="waterproof" className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">3. Waterproofing and rain protection</h2>
            <p className="mb-4 leading-relaxed">
              A handmade straw bag is not a rain bag, but a light, breathable
              protection extends its life noticeably. Once per season — or
              before a beach holiday — give it this simple treatment.
            </p>
            <ol className="list-decimal pl-6 space-y-3 leading-relaxed">
              <li>
                Choose a clear, silicone-free protector spray formulated
                for natural fibres or suede. Avoid coloured products and
                anything labelled &ldquo;leather only&rdquo;.
              </li>
              <li>
                Spray outdoors, in even passes, holding the can 25–30 cm
                away from the bag. Two light coats are always better than
                one heavy coat.
              </li>
              <li>
                Let the bag dry flat and uncovered for at least four hours
                before stuffing or using it.
              </li>
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              If the bag gets caught in rain: blot — never rub — with a dry
              cotton towel, stuff it loosely to hold the shape, and air-dry
              away from radiators and direct sun.
            </p>
          </section>

          <section id="reshape" className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">4. Reshaping a crushed straw bag</h2>
            <p className="mb-4 leading-relaxed">
              A flattened tote or a wavy bucket bag is almost always
              recoverable. Straw remembers its original shape when you give
              it gentle warmth and a little patience.
            </p>
            <ol className="list-decimal pl-6 space-y-3 leading-relaxed">
              <li>
                Bring a kettle to the boil and hold the misshapen area
                about 20&nbsp;cm above the spout for 10–15 seconds. The
                fibres should feel pliable, never wet.
              </li>
              <li>
                Stuff the bag firmly — but not stretched — with acid-free
                tissue or a clean rolled cotton T-shirt to support the
                shape from the inside.
              </li>
              <li>
                Smooth the body and base with your hands and let the bag
                stand stuffed for at least 24 hours. The shape sets as the
                fibre cools and dries.
              </li>
            </ol>
          </section>

          <section id="repair" className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">5. Repairing tears, handles and linings</h2>
            <p className="mb-4 leading-relaxed">
              Small repairs are the difference between a three-year bag and
              a thirty-year one. You only need three things: a blunt
              tapestry needle, matching natural raffia or fine cotton
              thread, and a clear textile glue.
            </p>
            <ul className="list-disc pl-6 space-y-3 leading-relaxed">
              <li>
                <strong>Loose strand or fray:</strong> tuck the strand back
                into the weave with the needle, then anchor it with a
                pinhead-sized drop of glue on the inside of the bag.
              </li>
              <li>
                <strong>Small tear (under 2&nbsp;cm):</strong> bring the
                edges together with a row of fine running stitches in
                matching raffia, knot inside the bag, and seal the stitch
                line with a thin film of clear textile glue.
              </li>
              <li>
                <strong>Loose handle or strap:</strong> reattach with a
                whip stitch in matching cotton thread, reinforced at both
                anchor points with a tiny square of fabric on the inside —
                never with hot glue, which discolours and stiffens the
                straw over time.
              </li>
              <li>
                <strong>Torn lining:</strong> hand-stitch with a slip
                stitch in matching thread. If the lining is heavily damaged,
                send the bag back to us — we replace linings in-house and
                can match the original fabric.
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Anything larger than a coin deserves an artisan&apos;s hand.
              Reach out and we will restore your Rif bag ourselves whenever
              possible.
            </p>
          </section>

          <section id="repair-quote" className="bg-primary/10 rounded-lg shadow-elegant p-8 md:p-10 border border-primary/20 mb-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-primary/20 rounded-full">
                <Wrench className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="mb-2 text-2xl">
                  Need a repair? Ask our artisans for a quote
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If the damage is beyond a home fix, our Rif weavers can
                  restore your straw bag by hand. Send a photo and we will
                  reply with a personal repair estimate within 48 hours.
                </p>
              </div>
              <Link
                to="/contact?subject=repair"
                className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                onClick={() =>
                  trackContact({
                    subject: 'repair',
                    contentName: 'Repair quote CTA - Care Guide Bags',
                  })
                }
                aria-label="Request a straw bag repair quote from the Rif artisans"
              >
                Request a quote
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section id="store" className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">6. How to store a straw bag between seasons</h2>
            <ul className="list-disc pl-6 space-y-3 leading-relaxed">
              <li>
                Stuff the bag lightly with acid-free tissue paper or a soft
                cotton cloth to preserve the shape.
              </li>
              <li>
                Slip it inside a breathable cotton dust bag — never a
                plastic one, which traps humidity and accelerates mildew.
              </li>
              <li>
                Store the bag upright on a wardrobe shelf, in a cool, dark,
                dry space, away from radiators and direct sunlight.
              </li>
              <li>
                Never stack heavy items on top — straw bags hold their
                shape when standing free, not compressed.
              </li>
              <li>
                Once a month in storage, give the bag 30 minutes of fresh
                air to let any residual humidity escape.
              </li>
            </ul>
          </section>

          <nav
            id="continue-exploring"
            aria-label="Related pages"
            className="bg-secondary/30 rounded-lg p-8 md:p-10 border border-border mb-10"
          >
            <h2 className="mb-4">Continue exploring</h2>
            <ul className="space-y-3 leading-relaxed">
              <li>
                Browse our{' '}
                <Link to="/products" className="underline text-primary">
                  handmade straw bag and hat collection
                </Link>{' '}
                — every piece in this guide is one we ship today.
              </li>
              <li>
                Discover the{' '}
                <Link to="/artisans" className="underline text-primary">
                  Rif weavers and cooperatives
                </Link>{' '}
                who hand-knot each bag.
              </li>
              <li>
                Read the{' '}
                <Link to="/care-guide" className="underline text-primary">
                  straw hat care guide
                </Link>{' '}
                for the same artisan rituals applied to brims and crowns.
              </li>
              <li>
                Check{' '}
                <Link to="/shipping" className="underline text-primary">
                  shipping
                </Link>{' '}
                and{' '}
                <Link to="/returns" className="underline text-primary">
                  returns
                </Link>{' '}
                before you order, or{' '}
                <Link to="/contact" className="underline text-primary">
                  contact our workshop
                </Link>{' '}
                for a personal repair quote.
              </li>
              <li>
                More questions?{' '}
                <Link to="/faq" className="underline text-primary">
                  Visit our FAQ
                </Link>
                .
              </li>
            </ul>
          </nav>
        </article>
      </main>
      <PageFooter />
    </div>
  );
};

export default CareGuideBags;
