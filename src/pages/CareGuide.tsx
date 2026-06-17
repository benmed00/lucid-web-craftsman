import { Link } from 'react-router-dom';
import { Wrench, ArrowRight } from 'lucide-react';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';
import { trackContact } from '@/lib/tracking/pixels';

const CareGuide = () => {
  const url = 'https://rif-raw-straw.lovable.app/care-guide';

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Clean, Reshape & Repair a Straw Hat — Rif Artisan Guide',
    description:
      'Expert care, cleaning, reshaping and repair guide for handwoven straw hats, written by the artisans of the Rif mountains.',
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
        name: 'How do I clean a straw hat without damaging it?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use a soft brush to lift dust, then spot-clean with a barely damp cloth and a drop of mild soap. Never soak a straw hat — water relaxes the weave and can warp the crown and brim.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can a misshapen straw hat be reshaped at home?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Hold the brim 20 cm above a kettle for 10–15 seconds so the steam softens the fibres, then gently mould the crown and brim back into shape with your hands and let it air-dry on a rounded surface.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I repair a small tear or loose weave?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'For a loose strand, tuck it back into the weave with a blunt needle and secure it with a tiny drop of clear textile glue. For a small tear, stitch the edges together with matching natural raffia or cotton thread before sealing with glue.',
        },
      },
      {
        '@type': 'Question',
        name: 'How should I store a straw hat between seasons?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Stuff the crown lightly with acid-free tissue, store the hat upside down on its crown or on a hat stand, and keep it in a cool, dry, dark place away from direct sun and humidity.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHelmet
        title="How to Clean, Reshape & Repair a Straw Hat — Rif Artisan Guide"
        description="Expert care guide from Rif artisans: how to clean, reshape, repair and store handwoven straw hats so they last for years."
        keywords={[
          'how to clean a straw hat',
          'straw hat repair',
          'reshape straw hat',
          'straw hat care',
          'handmade hat maintenance',
          'Rif artisans',
        ]}
        url="/care-guide"
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
              How to Clean, Reshape &amp; Repair a Straw Hat
            </h1>
            <p className="text-body-lg text-muted-foreground leading-relaxed">
              A handwoven straw hat is meant to last decades, not seasons. The
              weavers of the Rif mountains have cared for these hats for
              generations — here are the exact steps they use to keep every
              strand of doum and raffia looking its best.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href="/downloads/rif-straw-hat-care-guide.pdf"
                download
                className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Download the Rif straw hat care guide as a PDF"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download the PDF guide
              </a>
            </div>
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
                <a href="#clean" className="underline text-primary hover:text-primary/80 transition">
                  How to clean a straw hat
                </a>
              </li>
              <li>
                <a href="#reshape" className="underline text-primary hover:text-primary/80 transition">
                  How to reshape a straw hat with steam
                </a>
              </li>
              <li>
                <a href="#repair" className="underline text-primary hover:text-primary/80 transition">
                  How to repair tears and loose weaves
                </a>
              </li>
              <li>
                <a href="#repair-quote" className="underline text-primary hover:text-primary/80 transition">
                  Need a repair? Ask our artisans for a quote
                </a>
              </li>
              <li>
                <a href="#store" className="underline text-primary hover:text-primary/80 transition">
                  How to store a straw hat between seasons
                </a>
              </li>
              <li>
                <a href="#weavers-note" className="underline text-primary hover:text-primary/80 transition">
                  A note from the Rif weavers
                </a>
              </li>
              <li>
                <a href="#continue-exploring" className="underline text-primary hover:text-primary/80 transition">
                  Continue exploring
                </a>
              </li>
            </ol>
          </nav>

          <section id="clean" className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">1. How to clean a straw hat</h2>
            <p className="mb-4 leading-relaxed">
              Straw is a living fibre. It loves a gentle hand and dislikes
              water, heat and harsh chemicals. For routine dust and salt,
              this two-step ritual is all you need:
            </p>
            <ol className="list-decimal pl-6 space-y-3 leading-relaxed">
              <li>
                <strong>Dry-brush first.</strong> Using a soft-bristle clothes
                brush or a clean make-up brush, sweep the brim and crown in
                the direction of the weave. This lifts dust without snagging
                the fibres.
              </li>
              <li>
                <strong>Spot-clean second.</strong> Dampen a white cotton cloth
                with cool water and a single drop of pH-neutral soap (a baby
                shampoo works well). Press — never rub — the stain, then dab
                with a dry cloth to lift the moisture out.
              </li>
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Avoid: machine washing, bleach, alcohol-based wipes, and
              soaking. All of them dissolve the natural waxes that give the
              straw its sheen and strength.
            </p>
          </section>

          <section className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">2. How to reshape a straw hat with steam</h2>
            <p className="mb-4 leading-relaxed">
              A crushed crown or a wavy brim is almost always recoverable —
              straw remembers its shape when you give it a little warmth and
              moisture.
            </p>
            <ol className="list-decimal pl-6 space-y-3 leading-relaxed">
              <li>
                Bring a kettle to the boil and hold the affected area about
                20&nbsp;cm above the spout for 10–15 seconds. The fibres
                should feel pliable, never wet.
              </li>
              <li>
                With both hands, gently push the crown back into its dome and
                smooth the brim against a flat surface or a round bowl that
                matches its curve.
              </li>
              <li>
                Let the hat air-dry for at least 12 hours on a hat stand or
                upside-down on its crown. Do not wear it while it is still
                warm — the shape sets as it cools.
              </li>
            </ol>
          </section>

          <section className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">3. How to repair tears and loose weaves</h2>
            <p className="mb-4 leading-relaxed">
              Small repairs are the difference between a five-year hat and a
              fifty-year hat. You only need three things: a blunt tapestry
              needle, matching natural raffia or fine cotton thread, and a
              clear textile glue.
            </p>
            <ul className="list-disc pl-6 space-y-3 leading-relaxed">
              <li>
                <strong>Loose strand:</strong> tuck the strand back into the
                weave with the needle, then anchor it with a pinhead-sized
                drop of glue on the underside.
              </li>
              <li>
                <strong>Small tear (under 1 cm):</strong> bring the edges
                together with a row of fine running stitches, knot on the
                inside, and seal the stitch line with a thin film of glue.
              </li>
              <li>
                <strong>Loose ribbon or sweatband:</strong> reattach with a
                whip stitch in matching cotton thread — never with hot glue,
                which discolours the straw over time.
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Anything larger than a fingernail deserves an artisan&apos;s
              hand. Reach out and we will repair your Rif hat ourselves
              whenever possible.
            </p>
          </section>

          <section className="bg-primary/10 rounded-lg shadow-elegant p-8 md:p-10 border border-primary/20 mb-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-primary/20 rounded-full">
                <Wrench className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="mb-2 text-2xl">
                  Need a repair? Ask our artisans for a quote
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If the damage is beyond a home fix, our Rif weavers can restore
                  your hat by hand. Send a photo and we will reply with a
                  personal repair estimate within 48 hours.
                </p>
              </div>
              <Link
                to="/contact?subject=repair"
                className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elegant transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                onClick={() =>
                  trackContact({
                    subject: 'repair',
                    contentName: 'Repair quote CTA - Care Guide',
                  })
                }
                aria-label="Request a repair quote from the Rif artisans"
              >
                Request a quote
                <ArrowRight
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </section>

          <section className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">4. How to store a straw hat between seasons</h2>
            <ul className="list-disc pl-6 space-y-3 leading-relaxed">
              <li>
                Stuff the crown lightly with acid-free tissue paper to hold
                its shape.
              </li>
              <li>
                Store the hat upside down on its crown, on a wide hat stand,
                or inside a rigid hat box.
              </li>
              <li>
                Keep it cool, dark and dry — never on a sunny shelf, never in
                a damp cellar, never in a plastic bag.
              </li>
              <li>
                Once a month in storage, give it 30 minutes of fresh air to
                let any humidity escape.
              </li>
            </ul>
          </section>

          <section className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
            <h2 className="mb-4">A note from the Rif weavers</h2>
            <p className="leading-relaxed mb-4">
              Every hat we ship from the Rif is woven by hand from doum palm
              and raffia harvested in the same valleys our families have
              worked for generations. Meet the people behind each piece on
              our{' '}
              <Link to="/artisans" className="underline text-primary">
                artisans page
              </Link>
              , or read the longer{' '}
              <Link to="/story" className="underline text-primary">
                story of Rif Elegance
              </Link>{' '}
              to understand the techniques referenced in this guide.
            </p>
            <p className="leading-relaxed">
              Looked after with these simple gestures, your hat will keep its
              shape, scent and warmth long after the trend cycle has moved
              on — and that is exactly the point.
            </p>
          </section>

          <nav
            aria-label="Related pages"
            className="bg-secondary/30 rounded-lg p-8 md:p-10 border border-border mb-10"
          >
            <h2 className="mb-4">Continue exploring</h2>
            <ul className="space-y-3 leading-relaxed">
              <li>
                Browse our{' '}
                <Link to="/products" className="underline text-primary">
                  handwoven straw hat collection
                </Link>{' '}
                — every piece in this guide is one we ship today.
              </li>
              <li>
                Discover the{' '}
                <Link to="/artisans" className="underline text-primary">
                  Rif weavers and cooperatives
                </Link>{' '}
                who craft each hat by hand.
              </li>
              <li>
                Read the{' '}
                <Link to="/story" className="underline text-primary">
                  Rif Elegance story
                </Link>{' '}
                and our commitment to slow, durable craft.
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

export default CareGuide;
