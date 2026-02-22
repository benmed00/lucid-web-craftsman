import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Hr,
  Button,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface ShippingNotificationEmailProps {
  customerName: string;
  orderNumber: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    image?: string;
  }>;
}

export const ShippingNotificationEmail = ({
  customerName,
  orderNumber,
  trackingNumber,
  carrier,
  trackingUrl,
  estimatedDelivery,
  shippingAddress,
  items,
}: ShippingNotificationEmailProps) => {
  const previewText = `Votre commande #${orderNumber} a été expédiée !`;

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

          {/* Shipping Icon & Title */}
          <Section style={heroSection}>
            <Text style={shippingIcon}>📦</Text>
            <Heading style={heroTitle}>Votre commande est en route !</Heading>
            <Text style={heroSubtitle}>
              Bonne nouvelle {customerName}, votre commande a été expédiée.
            </Text>
          </Section>

          {/* Order Details */}
          <Section style={orderInfoSection}>
            <Row>
              <Column style={orderInfoColumn}>
                <Text style={orderInfoLabel}>Numéro de commande</Text>
                <Text style={orderInfoValue}>#{orderNumber}</Text>
              </Column>
              {carrier && (
                <Column style={orderInfoColumn}>
                  <Text style={orderInfoLabel}>Transporteur</Text>
                  <Text style={orderInfoValue}>{carrier}</Text>
                </Column>
              )}
            </Row>
          </Section>

          {/* Tracking Section */}
          {trackingNumber && (
            <Section style={trackingSection}>
              <Heading as="h2" style={sectionTitle}>
                Suivre votre colis
              </Heading>
              <Text style={trackingNumber_style}>
                Numéro de suivi : <strong>{trackingNumber}</strong>
              </Text>
              {trackingUrl ? (
                <Button style={trackButton} href={trackingUrl}>
                  Suivre mon colis
                </Button>
              ) : (
                <Text style={trackingNote}>
                  Utilisez ce numéro sur le site du transporteur pour suivre votre livraison.
                </Text>
              )}
            </Section>
          )}

          {/* Estimated Delivery */}
          {estimatedDelivery && (
            <Section style={deliverySection}>
              <Text style={deliveryIcon}>🚚</Text>
              <Text style={deliveryLabel}>Livraison estimée</Text>
              <Text style={deliveryDate}>{estimatedDelivery}</Text>
            </Section>
          )}

          <Hr style={divider} />

          {/* Items Summary */}
          <Section style={itemsSection}>
            <Heading as="h2" style={sectionTitle}>
              Articles expédiés
            </Heading>
            {items.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemImageColumn}>
                  {item.image ? (
                    <Img
                      src={item.image}
                      alt={item.name}
                      width={60}
                      height={60}
                      style={itemImage}
                    />
                  ) : (
                    <div style={itemImagePlaceholder}>📦</div>
                  )}
                </Column>
                <Column style={itemDetailsColumn}>
                  <Text style={itemName}>{item.name}</Text>
                  <Text style={itemQuantity}>Quantité : {item.quantity}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Shipping Address */}
          <Section style={addressSection}>
            <Heading as="h2" style={sectionTitle}>
              Adresse de livraison
            </Heading>
            <Text style={addressText}>
              {shippingAddress.address}
              <br />
              {shippingAddress.postalCode} {shippingAddress.city}
              <br />
              {shippingAddress.country}
            </Text>
          </Section>

          {/* Help Section */}
          <Section style={helpSection}>
            <Text style={helpText}>
              Une question sur votre livraison ?{' '}
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

export default ShippingNotificationEmail;

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

const shippingIcon = {
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

const trackingSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#eff6ff',
};

const sectionTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const trackingNumber_style = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '0 0 20px 0',
};

const trackButton = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const trackingNote = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0',
  fontStyle: 'italic' as const,
};

const deliverySection = {
  padding: '24px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#fefce8',
};

const deliveryIcon = {
  fontSize: '32px',
  margin: '0 0 8px 0',
};

const deliveryLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
};

const deliveryDate = {
  color: '#854d0e',
  fontSize: '18px',
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

const itemRow = {
  marginBottom: '16px',
};

const itemImageColumn = {
  width: '80px',
  verticalAlign: 'top' as const,
};

const itemImage = {
  borderRadius: '8px',
  objectFit: 'cover' as const,
};

const itemImagePlaceholder = {
  width: '60px',
  height: '60px',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
};

const itemDetailsColumn = {
  verticalAlign: 'middle' as const,
  paddingLeft: '16px',
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

const addressSection = {
  padding: '32px 40px',
  backgroundColor: '#fafafa',
};

const addressText = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};

const helpSection = {
  padding: '24px 40px',
  textAlign: 'center' as const,
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
