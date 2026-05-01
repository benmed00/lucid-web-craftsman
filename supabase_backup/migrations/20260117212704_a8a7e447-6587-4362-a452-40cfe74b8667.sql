-- Seed blog posts with full content
INSERT INTO public.blog_posts (id, title, slug, excerpt, content, featured_image_url, status, is_featured, tags, published_at)
VALUES 
(
  gen_random_uuid(),
  'L''art du tissage traditionnel dans les montagnes du Rif',
  'art-tissage-traditionnel-rif',
  'Découvrez comment les artisans transmettent leurs techniques de génération en génération tout en adaptant leur savoir-faire aux tendances modernes.',
  E'## L''héritage ancestral du tissage rifain\n\nDans les montagnes escarpées du Rif marocain, un savoir-faire millénaire se transmet de mère en fille depuis des générations. Le tissage traditionnel, loin d''être une simple technique artisanale, représente un véritable patrimoine culturel vivant.\n\nChaque geste, chaque nœud, chaque motif raconte une histoire. Les artisanes perpétuent non seulement des techniques, mais aussi une philosophie de vie basée sur le respect de la nature et la valorisation du travail manuel.\n\n## Les techniques transmises de génération en génération\n\nLe métier à tisser traditionnel, appelé \"handira\", est au cœur de cet artisanat. Fabriqué en bois local, il permet de créer des pièces uniques aux motifs géométriques caractéristiques de la région. Les jeunes apprenties commencent dès leur plus jeune âge à observer leurs aînées, avant de prendre progressivement en main les fils et les navettes.\n\nLa préparation des fibres naturelles est une étape cruciale. Les feuilles de palmier doum sont récoltées, séchées puis travaillées pendant plusieurs jours avant de pouvoir être tissées. Cette patience et ce respect du temps sont des valeurs fondamentales de l''artisanat rifain.\n\n## Adaptation aux tendances modernes\n\nSi les techniques restent traditionnelles, les créations évoluent pour répondre aux goûts contemporains. Les artisanes n''hésitent pas à expérimenter de nouvelles couleurs naturelles, à adapter les formats de leurs créations ou à collaborer avec des designers pour créer des pièces uniques.\n\nCette capacité d''adaptation, tout en préservant l''authenticité du savoir-faire, est la clé de la pérennité de cet artisanat. Les jeunes générations trouvent ainsi un équilibre entre tradition et modernité.',
  '/assets/images/blog/tissage.jpg',
  'published',
  true,
  ARRAY['artisanat', 'tissage', 'tradition', 'rif'],
  NOW() - INTERVAL '1 day'
),
(
  gen_random_uuid(),
  'Matériaux naturels : la beauté des fibres végétales',
  'materiaux-naturels-fibres-vegetales',
  'Quels sont les matériaux utilisés dans la confection de nos sacs et chapeaux? Une exploration des fibres locales et durables que nous privilégions.',
  E'## La richesse des fibres naturelles\n\nLe Maroc regorge de ressources naturelles qui constituent la base de notre artisanat. Des montagnes du Rif aux oasis du sud, chaque région offre des matériaux uniques aux propriétés exceptionnelles.\n\nNos artisans travaillent principalement trois types de fibres : le palmier doum, le raphia et la paille de blé. Chacune possède ses caractéristiques propres et se prête à des créations différentes.\n\n## Le palmier doum, roi des fibres\n\nLe palmier doum, ou \"Chamaerops humilis\", pousse naturellement dans les régions côtières et montagneuses du Maroc. Ses feuilles, une fois séchées et préparées, offrent une fibre souple et résistante, idéale pour la confection de sacs et paniers.\n\nLa récolte se fait de manière durable, en ne prélevant que les feuilles matures sans endommager le cœur de la plante. Cette pratique ancestrale garantit la pérennité de cette ressource précieuse.\n\n## Un choix écologique et durable\n\nEn choisissant des fibres naturelles et locales, nous réduisons notre impact environnemental tout en soutenant l''économie locale. Contrairement aux matériaux synthétiques, nos fibres sont biodégradables et ne génèrent aucune pollution.\n\nDe plus, le processus de préparation des fibres est entièrement naturel : séchage au soleil, teintures végétales, pas de produits chimiques. Un choix responsable pour une mode éthique.',
  '/assets/images/blog/fibre_vegetal.jpg',
  'published',
  false,
  ARRAY['durabilité', 'matériaux', 'écologie', 'fibres'],
  NOW() - INTERVAL '17 days'
),
(
  gen_random_uuid(),
  'Rencontre avec Amina, maître artisane depuis 40 ans',
  'rencontre-amina-maitre-artisane',
  'Le portrait touchant d''une des plus anciennes artisanes de notre coopérative, qui perpétue un savoir-faire ancestral avec passion et dévouement.',
  E'## Une vie dédiée à l''artisanat\n\nÀ 65 ans, Amina est l''une des doyennes de notre coopérative. Ses mains expertes ont tissé des milliers de créations au cours de sa vie, et aujourd''hui encore, elle transmet son savoir aux plus jeunes avec une patience infinie.\n\n\"J''ai commencé à tisser à l''âge de 8 ans, aux côtés de ma grand-mère\", nous raconte-t-elle avec un sourire. \"À cette époque, chaque famille fabriquait ses propres paniers et sacs. C''était une nécessité, mais aussi un plaisir.\"\n\n## L''évolution d''un savoir-faire\n\nAu fil des décennies, Amina a vu son métier se transformer. De production domestique, le tissage est devenu une activité économique à part entière, permettant aux femmes de la région de gagner leur indépendance financière.\n\n\"Avant, nous tissions pour nos familles. Maintenant, nos créations voyagent dans le monde entier. C''est une grande fierté.\"\n\n## Transmettre pour préserver\n\nChaque semaine, Amina accueille de jeunes apprenties dans son atelier. Elle leur enseigne non seulement les techniques, mais aussi les valeurs : patience, précision, respect des matériaux.\n\n\"Le plus important, c''est de prendre son temps. Un beau tissage ne se fait pas dans la précipitation. Il faut écouter les fibres, sentir leur résistance, respecter leur nature.\"\n\nPour Amina, la transmission est essentielle : \"Si nous ne formons pas la nouvelle génération, notre art disparaîtra. C''est notre responsabilité de le préserver.\"',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80',
  'published',
  true,
  ARRAY['portrait', 'artisane', 'tradition', 'transmission'],
  NOW() - INTERVAL '35 days'
),
(
  gen_random_uuid(),
  'Les symboles berbères dans nos créations',
  'symboles-berberes-creations',
  'Chaque motif raconte une histoire. Découvrez la signification des symboles ancestraux que vous retrouvez sur nos créations artisanales.',
  E'## Un langage visuel ancestral\n\nLes motifs berbères ne sont pas de simples décorations. Ils constituent un véritable langage symbolique, transmis depuis des millénaires. Chaque forme, chaque ligne possède une signification profonde, enracinée dans la culture amazighe.\n\n## Les symboles les plus courants\n\n**La croix berbère (Yaz)** : Symbole d''homme libre, elle représente la lettre \"Z\" de l''alphabet tifinagh et incarne l''identité amazighe.\n\n**Le losange** : Symbole de fertilité et de féminité, il évoque le ventre maternel et la continuité de la vie.\n\n**Le triangle** : Pointé vers le haut, il symbolise la masculinité. Vers le bas, il représente la féminité. Ensemble, ils expriment l''équilibre et l''harmonie.\n\n**La spirale** : Elle symbolise l''éternité, le cycle de la vie et la connexion entre le passé et le futur.\n\n## L''intégration dans nos créations\n\nNos artisanes intègrent ces symboles dans leurs tissages avec respect et intention. Chaque création raconte ainsi une histoire, porte un message.\n\n\"Quand je tisse un motif, je pense à sa signification\", explique Fatima, une de nos artisanes. \"C''est une façon de bénir l''objet et de transmettre de l''énergie positive à celui qui le portera.\"\n\nAinsi, chaque sac, chaque chapeau que vous portez n''est pas qu''un simple accessoire. C''est un fragment de culture, un héritage vivant qui traverse les frontières et les générations.',
  '/assets/images/blog/symboles_berberes.webp',
  'published',
  false,
  ARRAY['culture', 'symboles', 'berbère', 'amazigh'],
  NOW() - INTERVAL '43 days'
),
(
  gen_random_uuid(),
  'Comment entretenir votre sac en fibres naturelles',
  'entretenir-sac-fibres-naturelles',
  'Nos conseils d''experts pour préserver la beauté et prolonger la durée de vie de vos accessoires artisanaux en fibres naturelles.',
  E'## Prendre soin de votre sac artisanal\n\nVotre sac en fibres naturelles est une pièce unique, fabriquée à la main avec des matériaux nobles. Avec quelques gestes simples, vous pouvez préserver sa beauté pendant de longues années.\n\n## Le nettoyage régulier\n\n**Pour la poussière** : Utilisez une brosse souple ou un chiffon sec pour dépoussiérer régulièrement votre sac. Un simple coup de brosse suffit à lui redonner son éclat.\n\n**Pour les taches légères** : Tamponnez délicatement avec un chiffon humide (pas mouillé). Laissez sécher naturellement, à l''air libre, loin de toute source de chaleur.\n\n**Important** : Évitez absolument de plonger votre sac dans l''eau ou de le passer en machine. Les fibres naturelles sont sensibles à l''eau et pourraient se déformer.\n\n## Le rangement\n\nQuand vous n''utilisez pas votre sac, rangez-le dans un endroit sec et aéré. Évitez les sacs plastiques hermétiques qui pourraient favoriser la moisissure.\n\nPour qu''il conserve sa forme, vous pouvez le rembourrer légèrement avec du papier de soie. Ne l''écrasez pas sous d''autres objets lourds.\n\n## Protection et entretien\n\n**Contre l''humidité** : Si votre sac est exposé à la pluie, laissez-le sécher naturellement, à plat, dans un endroit aéré. Ne le placez pas près d''un radiateur.\n\n**Contre le soleil** : Une exposition prolongée au soleil peut décolorer les fibres. Évitez de laisser votre sac en plein soleil pendant de longues heures.\n\nAvec ces quelques attentions, votre sac artisanal vous accompagnera pendant de nombreuses années, développant même une belle patine qui témoignera de son histoire.',
  'https://images.unsplash.com/photo-1610701596007-11502861dcfa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80',
  'published',
  false,
  ARRAY['conseils', 'entretien', 'sac', 'fibres'],
  NOW() - INTERVAL '61 days'
),
(
  gen_random_uuid(),
  'Notre engagement pour un commerce équitable',
  'engagement-commerce-equitable',
  'Comment nous assurons des conditions de travail justes et une rémunération équitable pour tous les artisans qui collaborent avec notre marque.',
  E'## Une vision éthique de l''artisanat\n\nChez Rif Raw Straw, nous croyons qu''un bel objet doit être créé dans de belles conditions. Notre engagement pour le commerce équitable n''est pas un argument marketing, mais une conviction profonde qui guide chacune de nos actions.\n\n## Une rémunération juste\n\nNous travaillons directement avec les artisans, sans intermédiaires. Cela nous permet de leur garantir une rémunération juste, bien supérieure aux prix du marché local.\n\n\"Avant, je vendais mes créations sur le marché pour quelques dirhams\", témoigne Khadija, une de nos artisanes. \"Aujourd''hui, je gagne correctement ma vie et je peux offrir un avenir à mes enfants.\"\n\n## Des conditions de travail respectueuses\n\nNos artisanes travaillent à leur rythme, depuis leur domicile ou dans nos ateliers collectifs. Aucune pression, aucun quota : la qualité prime sur la quantité.\n\nNous fournissons également les matières premières, ce qui évite aux artisanes d''avancer des frais. Les paiements sont effectués à la livraison, sans délai.\n\n## Un impact social concret\n\nUne partie de nos bénéfices est réinvestie dans la communauté : formations professionnelles, alphabétisation, soutien aux familles en difficulté.\n\n\"Grâce à la coopérative, j''ai appris à lire et à écrire\", raconte Zahra, 45 ans. \"Je peux maintenant aider mes enfants avec leurs devoirs.\"\n\n## Transparence et traçabilité\n\nChaque création est accompagnée d''une fiche indiquant le nom de l''artisane qui l''a réalisée. Cette transparence vous permet de savoir exactement d''où vient votre accessoire et qui l''a fabriqué.',
  'https://images.unsplash.com/photo-1515377905703-c4788e51af15?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80',
  'published',
  false,
  ARRAY['éthique', 'commerce équitable', 'artisans', 'engagement'],
  NOW() - INTERVAL '76 days'
);