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
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface OrderConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  currency: string;
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  estimatedDelivery?: string;
}

export const OrderConfirmationEmail = ({
  customerName = 'Client',
  orderNumber = '12345678',
  orderDate = new Date().toLocaleDateString('fr-FR'),
  items = [],
  subtotal = 0,
  shipping = 0,
  discount = 0,
  total = 0,
  currency = 'EUR',
  shippingAddress = {
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
  },
  estimatedDelivery = '5-7 jours ouvrés',
}: OrderConfirmationEmailProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  return (
    <Html>
      <Head />
      <Preview>
        Confirmation de votre commande #{orderNumber} - Rif Raw Straw
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>🌿 Rif Raw Straw</Heading>
            <Text style={tagline}>Artisanat Berbère Authentique</Text>
          </Section>

          {/* Hero */}
          <Section style={hero}>
            <Heading style={heroTitle}>Merci pour votre commande !</Heading>
            <Text style={heroSubtitle}>
              Bonjour {customerName}, nous avons bien reçu votre commande et
              nous la préparons avec soin.
            </Text>
          </Section>

          {/* Order Info */}
          <Section style={orderInfo}>
            <Row>
              <Column style={orderInfoColumn}>
                <Text style={orderInfoLabel}>Numéro de commande</Text>
                <Text style={orderInfoValue}>#{orderNumber}</Text>
              </Column>
              <Column style={orderInfoColumn}>
                <Text style={orderInfoLabel}>Date de commande</Text>
                <Text style={orderInfoValue}>{orderDate}</Text>
              </Column>
              <Column style={orderInfoColumn}>
                <Text style={orderInfoLabel}>Livraison estimée</Text>
                <Text style={orderInfoValue}>{estimatedDelivery}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Order Items */}
          <Section style={itemsSection}>
            <Heading as="h2" style={sectionTitle}>
              Récapitulatif de votre commande
            </Heading>

            {items.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemImageColumn}>
                  <div style={itemImagePlaceholder}>
                    {item.image ? (
                      <Img src={item.image} alt={item.name} style={itemImage} />
                    ) : (
                      <Text style={itemImageIcon}>🧺</Text>
                    )}
                  </div>
                </Column>
                <Column style={itemDetailsColumn}>
                  <Text style={itemName}>{item.name}</Text>
                  <Text style={itemQuantity}>Quantité: {item.quantity}</Text>
                </Column>
                <Column style={itemPriceColumn}>
                  <Text style={itemPrice}>
                    {formatPrice(item.price * item.quantity)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={divider} />

          {/* Order Summary */}
          <Section style={summarySection}>
            <Row style={summaryRow}>
              <Column style={summaryLabelColumn}>
                <Text style={summaryLabel}>Sous-total</Text>
              </Column>
              <Column style={summaryValueColumn}>
                <Text style={summaryValue}>{formatPrice(subtotal)}</Text>
              </Column>
            </Row>

            {discount > 0 && (
              <Row style={summaryRow}>
                <Column style={summaryLabelColumn}>
                  <Text style={discountLabel}>Réduction</Text>
                </Column>
                <Column style={summaryValueColumn}>
                  <Text style={discountValue}>-{formatPrice(discount)}</Text>
                </Column>
              </Row>
            )}

            <Row style={summaryRow}>
              <Column style={summaryLabelColumn}>
                <Text style={summaryLabel}>Livraison</Text>
              </Column>
              <Column style={summaryValueColumn}>
                <Text style={summaryValue}>
                  {shipping === 0 ? 'Gratuite' : formatPrice(shipping)}
                </Text>
              </Column>
            </Row>

            <Hr style={summaryDivider} />

            <Row style={totalRow}>
              <Column style={summaryLabelColumn}>
                <Text style={totalLabel}>Total</Text>
              </Column>
              <Column style={summaryValueColumn}>
                <Text style={totalValue}>{formatPrice(total)}</Text>
              </Column>
            </Row>
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

          <Hr style={divider} />

          {/* What's Next */}
          <Section style={nextStepsSection}>
            <Heading as="h2" style={sectionTitle}>
              Prochaines étapes
            </Heading>
            <Row style={stepRow}>
              <Column style={stepIconColumn}>
                <Text style={stepIcon}>📦</Text>
              </Column>
              <Column style={stepTextColumn}>
                <Text style={stepTitle}>Préparation</Text>
                <Text style={stepDescription}>
                  Nos artisans préparent votre commande avec le plus grand soin
                </Text>
              </Column>
            </Row>
            <Row style={stepRow}>
              <Column style={stepIconColumn}>
                <Text style={stepIcon}>🚚</Text>
              </Column>
              <Column style={stepTextColumn}>
                <Text style={stepTitle}>Expédition</Text>
                <Text style={stepDescription}>
                  Vous recevrez un email avec le numéro de suivi dès
                  l'expédition
                </Text>
              </Column>
            </Row>
            <Row style={stepRow}>
              <Column style={stepIconColumn}>
                <Text style={stepIcon}>🎁</Text>
              </Column>
              <Column style={stepTextColumn}>
                <Text style={stepTitle}>Livraison</Text>
                <Text style={stepDescription}>
                  Profitez de vos produits artisanaux fabriqués à la main !
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Une question ? Contactez-nous à{' '}
              <Link href="mailto:contact@rifrawstraw.com" style={footerLink}>
                contact@rifrawstraw.com
              </Link>
            </Text>
            <Text style={footerCopyright}>
              © 2025 Rif Raw Straw - Artisanat Berbère Authentique
            </Text>
            <Text style={footerTagline}>
              Fabriqué à la main dans les montagnes du Rif
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 40px',
  backgroundColor: '#4f5f31',
  textAlign: 'center' as const,
};

const logo = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const tagline = {
  color: '#c4d4a5',
  fontSize: '14px',
  margin: '0',
};

const hero = {
  padding: '40px',
  textAlign: 'center' as const,
  backgroundColor: '#f0f4e8',
};

const heroTitle = {
  color: '#4f5f31',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const heroSubtitle = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const orderInfo = {
  padding: '24px 40px',
  backgroundColor: '#fafafa',
};

const orderInfoColumn = {
  textAlign: 'center' as const,
  padding: '0 8px',
};

const orderInfoLabel = {
  color: '#999',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
};

const orderInfoValue = {
  color: '#333',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const divider = {
  borderColor: '#e6e6e6',
  margin: '0',
};

const itemsSection = {
  padding: '32px 40px',
};

const sectionTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 20px',
};

const itemRow = {
  marginBottom: '16px',
};

const itemImageColumn = {
  width: '60px',
  verticalAlign: 'top' as const,
};

const itemImagePlaceholder = {
  width: '50px',
  height: '50px',
  backgroundColor: '#f0f4e8',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

const itemImage = {
  width: '50px',
  height: '50px',
  objectFit: 'cover' as const,
  borderRadius: '8px',
};

const itemImageIcon = {
  fontSize: '24px',
  margin: '0',
  textAlign: 'center' as const,
};

const itemDetailsColumn = {
  verticalAlign: 'top' as const,
  paddingLeft: '12px',
};

const itemName = {
  color: '#333',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 4px',
};

const itemQuantity = {
  color: '#999',
  fontSize: '12px',
  margin: '0',
};

const itemPriceColumn = {
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
  width: '100px',
};

const itemPrice = {
  color: '#333',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const summarySection = {
  padding: '24px 40px',
  backgroundColor: '#fafafa',
};

const summaryRow = {
  marginBottom: '8px',
};

const summaryLabelColumn = {
  width: '70%',
};

const summaryValueColumn = {
  width: '30%',
  textAlign: 'right' as const,
};

const summaryLabel = {
  color: '#666',
  fontSize: '14px',
  margin: '0',
};

const summaryValue = {
  color: '#333',
  fontSize: '14px',
  margin: '0',
};

const discountLabel = {
  color: '#4f5f31',
  fontSize: '14px',
  margin: '0',
};

const discountValue = {
  color: '#4f5f31',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
};

const summaryDivider = {
  borderColor: '#ddd',
  margin: '12px 0',
};

const totalRow = {
  marginTop: '8px',
};

const totalLabel = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const totalValue = {
  color: '#4f5f31',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const addressSection = {
  padding: '32px 40px',
};

const addressText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const nextStepsSection = {
  padding: '32px 40px',
  backgroundColor: '#f0f4e8',
};

const stepRow = {
  marginBottom: '16px',
};

const stepIconColumn = {
  width: '50px',
  verticalAlign: 'top' as const,
};

const stepIcon = {
  fontSize: '24px',
  margin: '0',
};

const stepTextColumn = {
  verticalAlign: 'top' as const,
};

const stepTitle = {
  color: '#333',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
};

const stepDescription = {
  color: '#666',
  fontSize: '13px',
  margin: '0',
};

const footer = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  backgroundColor: '#333',
};

const footerText = {
  color: '#999',
  fontSize: '14px',
  margin: '0 0 8px',
};

const footerLink = {
  color: '#c4d4a5',
  textDecoration: 'underline',
};

const footerCopyright = {
  color: '#666',
  fontSize: '12px',
  margin: '16px 0 4px',
};

const footerTagline = {
  color: '#555',
  fontSize: '11px',
  fontStyle: 'italic',
  margin: '0',
};
