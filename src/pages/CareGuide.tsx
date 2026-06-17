import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';

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
          </header>

          <section className="bg-card rounded-lg shadow-elegant p-8 md:p-10 border border-border mb-10">
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
            <p className="leading-relaxed">
              Every hat we ship from the Rif is woven by hand from doum palm
              and raffia harvested in the same valleys our families have
              worked for generations. Looked after with these simple
              gestures, your hat will keep its shape, scent and warmth long
              after the trend cycle has moved on — and that is exactly the
              point.
            </p>
          </section>
        </article>
      </main>
      <PageFooter />
    </div>
  );
};

export default CareGuide;
