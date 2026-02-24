import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Hr,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface CancellationEmailProps {
  customerName: string;
  orderNumber: string;
  cancellationDate: string;
  reason?: string;
  isRefund: boolean;
  refundAmount?: number;
  currency?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  refundMethod?: string;
  refundDelay?: string;
}

export const CancellationEmail = ({
  customerName,
  orderNumber,
  cancellationDate,
  reason,
  isRefund,
  refundAmount,
  currency = 'EUR',
  items,
  refundMethod,
  refundDelay,
}: CancellationEmailProps) => {
  const previewText = isRefund
    ? `Remboursement de votre commande #${orderNumber}`
    : `Annulation de votre commande #${orderNumber}`;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>Rif Raw Straw</Heading>
            <Text style={tagline}>Artisanat berbère authentique</Text>
          </Section>

          {/* Status Icon & Title */}
          <Section style={isRefund ? refundHeroSection : cancelHeroSection}>
            <Text style={statusIcon}>{isRefund ? '💰' : '❌'}</Text>
            <Heading style={isRefund ? refundHeroTitle : cancelHeroTitle}>
              {isRefund
                ? 'Votre remboursement est en cours'
                : 'Commande annulée'}
            </Heading>
            <Text style={heroSubtitle}>
              Bonjour {customerName},{' '}
              {isRefund
                ? 'nous avons initié le remboursement de votre commande.'
                : 'votre commande a été annulée comme demandé.'}
            </Text>
          </Section>

          {/* Order Details */}
          <Section style={orderInfoSection}>
            <Row>
              <Column style={orderInfoColumn}>
                <Text style={orderInfoLabel}>Numéro de commande</Text>
                <Text style={orderInfoValue}>#{orderNumber}</Text>
              </Column>
              <Column style={orderInfoColumn}>
                <Text style={orderInfoLabel}>
                  {isRefund ? 'Date de remboursement' : "Date d'annulation"}
                </Text>
                <Text style={orderInfoValue}>{cancellationDate}</Text>
              </Column>
            </Row>
          </Section>

          {/* Reason if provided */}
          {reason && (
            <Section style={reasonSection}>
              <Text style={reasonLabel}>Raison :</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          )}

          <Hr style={divider} />

          {/* Items */}
          <Section style={itemsSection}>
            <Heading as="h2" style={sectionTitle}>
              Articles concernés
            </Heading>
            {items.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemNameColumn}>
                  <Text style={itemName}>{item.name}</Text>
                  <Text style={itemQuantity}>Quantité : {item.quantity}</Text>
                </Column>
                <Column style={itemPriceColumn}>
                  <Text style={itemPrice}>{formatPrice(item.price)}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Refund Details */}
          {isRefund && refundAmount && (
            <Section style={refundSection}>
              <Row>
                <Column>
                  <Text style={refundLabel}>Montant remboursé</Text>
                </Column>
                <Column style={refundAmountColumn}>
                  <Text style={refundAmountStyle}>
                    {formatPrice(refundAmount)}
                  </Text>
                </Column>
              </Row>
              {refundMethod && (
                <Text style={refundInfoText}>
                  Mode de remboursement : {refundMethod}
                </Text>
              )}
              {refundDelay && (
                <Text style={refundInfoText}>Délai estimé : {refundDelay}</Text>
              )}
            </Section>
          )}

          {/* Info Section */}
          <Section style={infoSection}>
            <Text style={infoText}>
              {isRefund
                ? "Le remboursement sera crédité sur votre moyen de paiement d'origine. Le délai peut varier selon votre banque (généralement 5-10 jours ouvrés)."
                : 'Si vous avez effectué un paiement, le remboursement sera traité automatiquement sous 5-10 jours ouvrés.'}
            </Text>
          </Section>

          {/* Help Section */}
          <Section style={helpSection}>
            <Text style={helpText}>
              Une question ?{' '}
              <Link href="mailto:contact@rifrawstraw.com" style={helpLink}>
                Contactez notre service client
              </Link>
            </Text>
          </Section>

          {/* CTA to shop again */}
          <Section style={ctaSection}>
            <Text style={ctaText}>Nous espérons vous revoir bientôt !</Text>
            <Button style={shopButton} href="https://rifrawstraw.com/products">
              Découvrir nos créations
            </Button>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Rif Raw Straw - Artisanat berbère
              authentique
            </Text>
            <Text style={footerLinks}>
              <Link href="https://rifrawstraw.com" style={footerLink}>
                Site web
              </Link>
              {' • '}
              <Link href="https://rifrawstraw.com/faq" style={footerLink}>
                FAQ
              </Link>
              {' • '}
              <Link href="https://rifrawstraw.com/contact" style={footerLink}>
                Contact
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CancellationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 40px',
  backgroundColor: '#1a1a2e',
  textAlign: 'center' as const,
};

const logo = {
  color: '#d4a574',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '1px',
};

const tagline = {
  color: '#a0a0a0',
  fontSize: '12px',
  margin: '8px 0 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
};

const cancelHeroSection = {
  padding: '40px',
  textAlign: 'center' as const,
  backgroundColor: '#fef2f2',
};

const refundHeroSection = {
  padding: '40px',
  textAlign: 'center' as const,
  backgroundColor: '#eff6ff',
};

const statusIcon = {
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const cancelHeroTitle = {
  color: '#991b1b',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 12px 0',
};

const refundHeroTitle = {
  color: '#1e40af',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 12px 0',
};

const heroSubtitle = {
  color: '#4b5563',
  fontSize: '16px',
  margin: '0',
};

const orderInfoSection = {
  padding: '24px 40px',
  backgroundColor: '#fafafa',
};

const orderInfoColumn = {
  textAlign: 'center' as const,
  padding: '0 16px',
};

const orderInfoLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
};

const orderInfoValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const reasonSection = {
  padding: '16px 40px',
  backgroundColor: '#fafafa',
  borderTop: '1px solid #e5e7eb',
};

const reasonLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
};

const reasonText = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '0',
};

const itemsSection = {
  padding: '32px 40px',
};

const sectionTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const itemRow = {
  marginBottom: '12px',
};

const itemNameColumn = {
  verticalAlign: 'top' as const,
};

const itemPriceColumn = {
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
};

const itemName = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px 0',
};

const itemQuantity = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0',
};

const itemPrice = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
};

const refundSection = {
  padding: '24px 40px',
  backgroundColor: '#eff6ff',
};

const refundLabel = {
  color: '#1e40af',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const refundAmountColumn = {
  textAlign: 'right' as const,
};

const refundAmountStyle = {
  color: '#1e40af',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0',
};

const refundInfoText = {
  color: '#3b82f6',
  fontSize: '13px',
  margin: '8px 0 0 0',
};

const infoSection = {
  padding: '24px 40px',
};

const infoText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const helpSection = {
  padding: '24px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#fafafa',
};

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const helpLink = {
  color: '#d4a574',
  textDecoration: 'underline',
};

const ctaSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const ctaText = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '0 0 16px 0',
};

const shopButton = {
  backgroundColor: '#d4a574',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  padding: '32px 40px',
  backgroundColor: '#1a1a2e',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#a0a0a0',
  fontSize: '12px',
  margin: '0 0 12px 0',
};

const footerLinks = {
  margin: '0',
};

const footerLink = {
  color: '#d4a574',
  fontSize: '12px',
  textDecoration: 'none',
};
