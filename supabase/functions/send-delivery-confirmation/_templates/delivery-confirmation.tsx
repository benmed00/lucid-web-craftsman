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
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface DeliveryConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  deliveryDate: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  reviewUrl?: string;
}

export const DeliveryConfirmationEmail = ({
  customerName,
  orderNumber,
  deliveryDate,
  items,
  reviewUrl,
}: DeliveryConfirmationEmailProps) => {
  const previewText = `Votre commande #${orderNumber} a été livrée !`;

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

          {/* Success Icon & Title */}
          <Section style={heroSection}>
            <Text style={successIcon}>✅</Text>
            <Heading style={heroTitle}>Votre commande a été livrée !</Heading>
            <Text style={heroSubtitle}>
              Bonjour {customerName}, nous espérons que vous êtes satisfait(e) de votre achat.
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
                <Text style={orderInfoLabel}>Date de livraison</Text>
                <Text style={orderInfoValue}>{deliveryDate}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Items Delivered */}
          <Section style={itemsSection}>
            <Heading as="h2" style={sectionTitle}>
              Articles livrés
            </Heading>
            {items.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column>
                  <Text style={itemName}>✓ {item.name}</Text>
                  <Text style={itemQuantity}>Quantité : {item.quantity}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Review Request */}
          <Section style={reviewSection}>
            <Text style={reviewIcon}>⭐</Text>
            <Heading as="h2" style={reviewTitle}>
              Votre avis compte !
            </Heading>
            <Text style={reviewText}>
              Partagez votre expérience et aidez d'autres clients à découvrir nos créations artisanales.
            </Text>
            {reviewUrl && (
              <Button style={reviewButton} href={reviewUrl}>
                Laisser un avis
              </Button>
            )}
          </Section>

          {/* Thank You Section */}
          <Section style={thankYouSection}>
            <Text style={thankYouText}>
              Merci d'avoir choisi Rif Raw Straw ! Votre soutien aide directement nos artisans à préserver leur savoir-faire traditionnel.
            </Text>
          </Section>

          {/* Help Section */}
          <Section style={helpSection}>
            <Text style={helpText}>
              Un problème avec votre commande ?{' '}
              <Link href="mailto:contact@rifrawstraw.com" style={helpLink}>
                Contactez-nous
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Rif Raw Straw - Artisanat berbère authentique
            </Text>
            <Text style={footerLinks}>
              <Link href="https://rifrawstraw.com" style={footerLink}>
                Site web
              </Link>
              {' • '}
              <Link href="https://rifrawstraw.com/products" style={footerLink}>
                Boutique
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

export default DeliveryConfirmationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
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

const heroSection = {
  padding: '40px',
  textAlign: 'center' as const,
  backgroundColor: '#f0fdf4',
};

const successIcon = {
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const heroTitle = {
  color: '#166534',
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
  paddingLeft: '20px',
};

const reviewSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#fef3c7',
};

const reviewIcon = {
  fontSize: '32px',
  margin: '0 0 12px 0',
};

const reviewTitle = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const reviewText = {
  color: '#78350f',
  fontSize: '14px',
  margin: '0 0 20px 0',
};

const reviewButton = {
  backgroundColor: '#d97706',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const thankYouSection = {
  padding: '24px 40px',
  textAlign: 'center' as const,
};

const thankYouText = {
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
