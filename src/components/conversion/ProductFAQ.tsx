import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const ProductFAQ = () => {
  const { t } = useTranslation('common');

  const faqs = [
    {
      question: t(
        'faq.shipping.question',
        'Quels sont les délais de livraison ?'
      ),
      answer: t(
        'faq.shipping.answer',
        "Livraison en 3-5 jours ouvrés en France métropolitaine. Livraison offerte dès 50€ d'achat."
      ),
    },
    {
      question: t('faq.returns.question', 'Puis-je retourner mon article ?'),
      answer: t(
        'faq.returns.answer',
        'Oui, vous disposez de 14 jours après réception pour retourner votre article. Le retour est gratuit et le remboursement est effectué sous 5 jours.'
      ),
    },
    {
      question: t(
        'faq.handmade.question',
        'Les produits sont-ils vraiment faits main ?'
      ),
      answer: t(
        'faq.handmade.answer',
        'Absolument. Chaque pièce est confectionnée à la main par nos artisans dans les montagnes du Rif. Chaque article est unique et peut présenter de légères variations, preuve de son authenticité.'
      ),
    },
    {
      question: t(
        'faq.payment.question',
        'Quels moyens de paiement acceptez-vous ?'
      ),
      answer: t(
        'faq.payment.answer',
        'Nous acceptons Visa, Mastercard et American Express via Stripe (paiement 100% sécurisé). Paiement à la livraison disponible en Loire-Atlantique (44).'
      ),
    },
    {
      question: t('faq.care.question', 'Comment entretenir mon produit ?'),
      answer: t(
        'faq.care.answer',
        "Nos produits en fibre naturelle se nettoient avec un chiffon humide. Évitez l'exposition prolongée à l'eau et au soleil direct. Rangez-les dans un endroit sec."
      ),
    },
  ];

  return (
    <div className="w-full">
      <h3 className="text-xl font-serif text-foreground mb-4">
        {t('faq.title', 'Questions fréquentes')}
      </h3>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger className="text-left text-sm font-medium">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
