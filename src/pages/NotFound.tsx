import { Link, useLocation } from "react-router-dom";

import Navigation from "../components/Navigation";
import PageFooter from "../components/PageFooter";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f7f3ee] relative overflow-hidden"
      style={{
        backgroundColor: "#f7f3ee",
      }}
    >
      {/* Effet tressage de paille subtil en parallaxe */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: "none",
        }}
      >
        <svg
          width="100%"
          height="100%"
          className="w-full h-full"
          style={{
            transform: "translateY(-2vw)",
            willChange: "transform",
            transition: "transform 1.2s cubic-bezier(.4,0,.2,1)",
          }}
        >
          <defs>
            <pattern
              id="straw"
              width="120"
              height="120"
              patternUnits="userSpaceOnUse"
            >
              <rect width="120" height="120" fill="#f7f3ee" />
              <path
                d="M0 60 Q60 0 120 60 Q60 120 0 60Z"
                fill="none"
                stroke="#e6dcc3"
                strokeWidth="2"
                opacity="0.18"
              />
              <path
                d="M60 0 Q120 60 60 120 Q0 60 60 0Z"
                fill="none"
                stroke="#bfae99"
                strokeWidth="1.5"
                opacity="0.12"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#straw)" />
        </svg>
      </div>

      {/* Overlay dégradé subtil */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#f7f3ee]/90 via-[#e6dcc3]/60 to-[#bfae99]/40 z-0 pointer-events-none" />

      {/* Entête */}
      <div className="relative z-10">
        <Navigation />
      </div>

      {/* Grid centrale */}
      <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-6 py-16 flex flex-col items-center justify-center">
        {/* Illustration chapeau stylisé avec 404 */}
        <div className="mb-8 flex justify-center">
          <svg
            width="160"
            height="110"
            viewBox="0 0 160 110"
            fill="none"
            aria-hidden="true"
            className="drop-shadow-md"
          >
            {/* Calotte du chapeau formant le 0 */}
            <ellipse
              cx="80"
              cy="55"
              rx="32"
              ry="30"
              fill="#e6dcc3"
              stroke="#bfae99"
              strokeWidth="2.5"
            />
            {/* Bord du chapeau */}
            <ellipse
              cx="80"
              cy="75"
              rx="60"
              ry="18"
              fill="#f7f3ee"
              stroke="#bfae99"
              strokeWidth="2"
            />
            {/* Ruban stylisé formant les deux 4 */}
            <path
              d="M48 78 Q52 60 60 60 Q68 60 68 78"
              stroke="#7d8c6a"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M112 78 Q108 60 100 60 Q92 60 92 78"
              stroke="#7d8c6a"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            {/* 404 intégré */}
            <text
              x="80"
              y="70"
              textAnchor="middle"
              fontFamily="'Playfair Display', serif"
              fontWeight="bold"
              fontSize="32"
              fill="#bfae99"
              opacity="0.25"
              letterSpacing="6"
              style={{ userSelect: "none" }}
            >
              404
            </text>
          </svg>
        </div>

        {/* Message bilingue */}
        <h1 className="text-3xl md:text-4xl font-serif font-extrabold text-[#7d6e4a] mb-4 tracking-tight">
          Désolé, ce chemin semble égaré...
        </h1>
        <h2 className="text-xl md:text-2xl font-serif text-[#7d8c6a] mb-2">
          ...comme un chapeau sous le vent provençal !
        </h2>
        <p className="text-base md:text-lg font-sans text-[#6b5c3a] mb-2">
          La page demandée n’existe pas ou n’est plus disponible.
        </p>
        <p className="text-base md:text-lg font-sans text-[#6b5c3a] mb-8">
          <span className="font-semibold">
            Sorry, this page can’t be found.
          </span>
        </p>

        {/* Bouton principal */}
        <Link
          to="/"
          className="inline-block px-8 py-3 rounded-full font-bold text-lg shadow transition-all duration-200 border-2 border-[#bfae99] bg-[#e6dcc3] text-[#7d6e4a] hover:bg-[#bfae99] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#7d8c6a] focus:ring-offset-2"
          style={{
            letterSpacing: "0.04em",
          }}
        >
          Retour à l’accueil / Back to Home
        </Link>
      </main>

      {/* Pied de page */}
      <div className="relative z-10">
        <PageFooter />
      </div>

      {/* Micro-interactions CSS */}
      <style>{`
        a[href]:hover {
          box-shadow: 0 4px 24px 0 #bfae9933;
          transform: translateY(-2px) scale(1.04);
        }
        @media (max-width: 640px) {
          main {
            padding-top: 3rem;
            padding-bottom: 3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
