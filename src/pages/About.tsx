import { Link } from "react-router-dom";
import SEOHelmet from "@/components/seo/SEOHelmet";

import PageFooter from "@/components/PageFooter";

const About = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEOHelmet
      title="À Propos - Rif Raw Straw"
      description="Découvrez notre histoire, notre passion pour l'artisanat berbère et notre engagement envers les artisans des montagnes du Rif."
      keywords={["à propos", "histoire", "artisanat berbère", "rif", "artisans", "mission"]}
      url="/about"
      type="website"
    />
    
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto bg-card rounded-lg shadow p-8 border border-border">
        <h1 className="text-3xl font-serif font-bold text-primary mb-6">
          À Propos de Rif Raw Straw
        </h1>
        <p className="text-lg text-foreground mb-6">
          L'aventure{" "}
          <span className="font-semibold text-primary">
            Rif Raw Straw
          </span>{" "}
          commence avec une passion commune : révéler la beauté de l'artisanat
          berbère et la partager au plus grand nombre.
        </p>
        <p className="text-muted-foreground mb-4">
          Depuis nos débuts, nous parcourons les ateliers, les marchés et les
          villages à la recherche de créateurs talentueux. Chaque rencontre,
          chaque objet, chaque histoire nourrit notre envie de valoriser le
          fait-main et l'authenticité.
        </p>
        <p className="text-muted-foreground mb-4">
          Aujourd'hui, notre boutique est le reflet de cette quête : une
          sélection exigeante, des pièces uniques, et une volonté de tisser un
          lien entre artisans et amoureux du beau.
        </p>
        <p className="text-muted-foreground">
          Merci de faire partie de cette aventure et de soutenir l'artisanat
          avec nous.
        </p>
      </div>
    </main>
    <PageFooter />
  </div>
);

export default About;
