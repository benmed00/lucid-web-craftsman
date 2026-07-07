/**
 * OrderEmailActions — composant unifié pour toutes les actions email
 * liées aux commandes admin.
 *
 * Remplace les 7 anciens boutons dédiés :
 *  - TestOrderEmailButton / TestShippingEmailButton /
 *    TestDeliveryEmailButton / TestCancellationEmailButton  (mode: 'test')
 *  - SendShippingEmailButton / SendDeliveryEmailButton /
 *    SendCancellationEmailButton                             (mode: 'send')
 *
 * Deux modes :
 *  - mode="test" : injecte un dataset de fixtures, demande seulement un email.
 *  - mode="send" : envoie la vraie commande, demande les champs client + spécifiques.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle,
  Loader2,
  Mail,
  Send,
  Truck,
  XCircle,
} from 'lucide-react';
import { invokeSupabaseEdgeFunction } from '@/services/supabaseFunctionsApi';
import { toast } from 'sonner';
import { useCurrency } from '@/stores/currencyStore';

export type OrderEmailType =
  | 'order-confirmation'
  | 'shipping'
  | 'delivery'
  | 'cancellation';

type Mode = 'test' | 'send';

export interface OrderEmailOrderItem {
  product_snapshot?: {
    name?: string;
    images?: string[];
    price?: number;
  };
  quantity: number;
  total_price?: number;
}

export interface OrderEmailActionsProps {
  mode: Mode;

  /** Types d'emails à exposer. Défaut : tous les types applicables au mode. */
  types?: OrderEmailType[];

  /** Contexte "send" (ignoré en mode test). */
  orderId?: string;
  orderItems?: OrderEmailOrderItem[];
  orderAmount?: number;
  defaultCustomerEmail?: string;
  defaultCustomerName?: string;
  onEmailSent?: () => void;
  /** Notifié quand une action email démarre/termine (pour afficher un état global). */
  onSendingChange?: (type: OrderEmailType, sending: boolean) => void;
}

interface ActionMeta {
  edgeFunction: string;
  icon: typeof Mail;
  buttonLabelTest: string;
  buttonLabelSend: string;
  dialogTitleTest: string;
  dialogTitleSend: string;
  descriptionTest: string;
  descriptionSend: string;
  buttonClassName?: string;
}

const ACTION_META: Record<OrderEmailType, ActionMeta> = {
  'order-confirmation': {
    edgeFunction: 'send-order-confirmation',
    icon: Mail,
    buttonLabelTest: 'Test Email',
    buttonLabelSend: 'Renvoyer confirmation',
    dialogTitleTest: "Tester l'email de confirmation",
    dialogTitleSend: 'Renvoyer la confirmation de commande',
    descriptionTest:
      "Envoyez un email de test pour vérifier le template de confirmation de commande.",
    descriptionSend:
      "Renvoyez la confirmation de commande au client.",
  },
  shipping: {
    edgeFunction: 'send-shipping-notification',
    icon: Truck,
    buttonLabelTest: 'Test Expédition',
    buttonLabelSend: 'Notifier expédition',
    dialogTitleTest: "Tester l'email d'expédition",
    dialogTitleSend: "Envoyer une notification d'expédition",
    descriptionTest:
      "Envoyez un email de test pour vérifier le template de notification d'expédition.",
    descriptionSend:
      "Envoyez un email au client pour l'informer que sa commande a été expédiée.",
  },
  delivery: {
    edgeFunction: 'send-delivery-confirmation',
    icon: CheckCircle,
    buttonLabelTest: 'Test Livraison',
    buttonLabelSend: 'Livré',
    dialogTitleTest: "Tester l'email de livraison",
    dialogTitleSend: 'Confirmer la livraison',
    descriptionTest:
      "Envoyez un email de test pour vérifier le template de confirmation de livraison.",
    descriptionSend:
      "Envoyez un email au client pour confirmer la livraison et demander un avis.",
    buttonClassName: 'text-green-600 hover:text-green-600',
  },
  cancellation: {
    edgeFunction: 'send-cancellation-email',
    icon: XCircle,
    buttonLabelTest: 'Test Annulation',
    buttonLabelSend: 'Annulation',
    dialogTitleTest: "Tester l'email d'annulation",
    dialogTitleSend: "Envoyer une notification d'annulation",
    descriptionTest:
      "Envoyez un email de test pour vérifier le template d'annulation/remboursement.",
    descriptionSend:
      "Envoyez un email au client pour l'informer de l'annulation ou du remboursement.",
    buttonClassName: 'text-destructive hover:text-destructive',
  },
};

const DEFAULT_TYPES_TEST: OrderEmailType[] = [
  'order-confirmation',
  'shipping',
  'delivery',
  'cancellation',
];
const DEFAULT_TYPES_SEND: OrderEmailType[] = [
  'shipping',
  'delivery',
  'cancellation',
];

// -----------------------------------------------------------------------------
// Fixtures — mode test
// -----------------------------------------------------------------------------
function buildTestPayload(type: OrderEmailType, email: string) {
  const orderId = 'TEST-' + Date.now().toString().slice(-8);
  const commonItems = [
    {
      name: 'Chapeau de paille berbère',
      quantity: 1,
      price: 45.0,
      image: '/assets/images/products/chapeau_de_paille_berbere.jpg',
    },
    {
      name: 'Sac à main tissé traditionnel',
      quantity: 2,
      price: 65.0,
      image: '/assets/images/products/sac_a_main_tisse_traditionnel.jpg',
    },
  ];

  switch (type) {
    case 'order-confirmation':
      return {
        orderId,
        customerEmail: email,
        customerName: 'Client Test',
        items: commonItems,
        subtotal: 175.0,
        shipping: 5.9,
        discount: 10.0,
        total: 170.9,
        currency: 'EUR',
        shippingAddress: {
          address: '123 Rue de Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        },
      };
    case 'shipping':
      return {
        orderId,
        customerEmail: email,
        customerName: 'Client Test',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'La Poste',
        trackingUrl:
          'https://www.laposte.fr/outils/suivre-vos-envois?code=1Z999AA10123456784',
        estimatedDelivery: '15-18 janvier 2025',
        shippingAddress: {
          address: '123 Rue de Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        },
        items: commonItems.map(({ name, quantity, image }) => ({
          name,
          quantity,
          image,
        })),
      };
    case 'delivery':
      return {
        orderId,
        customerEmail: email,
        customerName: 'Client Test',
        deliveryDate: new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        items: commonItems.map(({ name, quantity }) => ({ name, quantity })),
        reviewUrl: 'https://rifrawstraw.com/products',
      };
    case 'cancellation':
      return {
        orderId,
        customerEmail: email,
        customerName: 'Client Test',
        orderAmount: 8500,
        refundAmount: 8500,
        reason: 'Demande du client - Email de test',
        items: commonItems.map(({ name, quantity }) => ({ name, quantity })),
      };
  }
}

// -----------------------------------------------------------------------------
// Composant principal
// -----------------------------------------------------------------------------
export function OrderEmailActions({
  mode,
  types,
  orderId,
  orderItems,
  orderAmount,
  defaultCustomerEmail,
  defaultCustomerName,
  onEmailSent,
}: OrderEmailActionsProps) {
  const activeTypes = useMemo(() => {
    const fallback = mode === 'test' ? DEFAULT_TYPES_TEST : DEFAULT_TYPES_SEND;
    const list = types ?? fallback;
    // En mode "send", 'order-confirmation' ne dispose pas de formulaire dédié.
    return mode === 'send'
      ? list.filter((t) => t !== 'order-confirmation')
      : list;
  }, [mode, types]);

  return (
    <>
      {activeTypes.map((type) => (
        <OrderEmailActionButton
          key={type}
          mode={mode}
          type={type}
          orderId={orderId}
          orderItems={orderItems}
          orderAmount={orderAmount}
          defaultCustomerEmail={defaultCustomerEmail}
          defaultCustomerName={defaultCustomerName}
          onEmailSent={onEmailSent}
        />
      ))}
    </>
  );
}

// -----------------------------------------------------------------------------
// Un bouton + son dialogue
// -----------------------------------------------------------------------------
interface OrderEmailActionButtonProps
  extends Omit<OrderEmailActionsProps, 'types'> {
  type: OrderEmailType;
}

function OrderEmailActionButton({
  mode,
  type,
  orderId,
  orderItems = [],
  orderAmount = 0,
  defaultCustomerEmail = '',
  defaultCustomerName = '',
  onEmailSent,
}: OrderEmailActionButtonProps) {
  const meta = ACTION_META[type];
  const Icon = meta.icon;

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // Champs partagés
  const [email, setEmail] = useState(defaultCustomerEmail);
  const [customerName, setCustomerName] = useState(defaultCustomerName);

  // Shipping (send)
  const [carrier, setCarrier] = useState('La Poste');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('France');

  // Delivery (send)
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );

  // Cancellation (send)
  const [isRefund, setIsRefund] = useState(true);
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('Carte bancaire');
  const [refundDelay, setRefundDelay] = useState('5-10 jours ouvrés');

  const { formatPrice } = useCurrency();

  const buildSendPayload = (): Record<string, unknown> => {
    const items = orderItems.map((item) => ({
      name: item.product_snapshot?.name || 'Produit',
      quantity: item.quantity,
      ...(item.product_snapshot?.images?.[0] && {
        image: item.product_snapshot.images[0],
      }),
      ...(item.total_price !== undefined && { price: item.total_price }),
    }));

    switch (type) {
      case 'shipping':
        return {
          orderId,
          customerEmail: email,
          customerName,
          trackingNumber: trackingNumber || undefined,
          carrier: carrier || undefined,
          trackingUrl: trackingUrl || undefined,
          estimatedDelivery: estimatedDelivery || undefined,
          shippingAddress: { address, city, postalCode, country },
          items,
        };
      case 'delivery':
        return {
          orderId,
          customerEmail: email,
          customerName,
          deliveryDate,
          items,
          reviewUrl: 'https://rifrawstraw.com/products',
        };
      case 'cancellation':
        return {
          orderId,
          customerEmail: email,
          customerName,
          isRefund,
          reason: reason || undefined,
          refundAmount: isRefund ? orderAmount / 100 : undefined,
          currency: 'EUR',
          items,
          refundMethod: isRefund ? refundMethod : undefined,
          refundDelay: isRefund ? refundDelay : undefined,
        };
      case 'order-confirmation':
        return { orderId, customerEmail: email, customerName, items };
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (mode === 'test' && !email) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }
    if (mode === 'send' && (!email || !customerName)) {
      toast.error("Veuillez remplir l'email et le nom du client");
      return;
    }

    // Toast ID stable par (mode, type) : garantit une seule notification
    // par action, remplaçable de "loading" → "success"/"error".
    const toastId = `order-email:${mode}:${type}`;
    toast.loading(loadingMessage(type, mode), { id: toastId });

    setSending(true);
    try {
      const payload =
        mode === 'test' ? buildTestPayload(type, email) : buildSendPayload();

      const { data, error } = await invokeSupabaseEdgeFunction(
        meta.edgeFunction,
        payload as Record<string, unknown>
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Erreur inconnue');
      }

      toast.success(
        mode === 'test'
          ? `Email de test envoyé à ${email}`
          : successMessage(type, isRefund),
        {
          id: toastId,
          description:
            mode === 'test'
              ? `Type : ${humanType(type)}`
              : `Commande ${orderId ?? ''}`.trim(),
        }
      );
      setOpen(false);
      if (mode === 'test') setEmail('');
      onEmailSent?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error sending ${type} email:`, err);
      toast.error(errorMessage(type, mode), {
        id: toastId,
        description: message,
      });
    } finally {
      setSending(false);
    }
  };

  const buttonLabel =
    mode === 'test' ? meta.buttonLabelTest : meta.buttonLabelSend;
  const dialogTitle =
    mode === 'test' ? meta.dialogTitleTest : meta.dialogTitleSend;
  const description =
    mode === 'test' ? meta.descriptionTest : meta.descriptionSend;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={mode === 'send' ? 'sm' : undefined}
          disabled={sending}
          aria-busy={sending}
          className={`gap-${mode === 'send' ? '1' : '2'} ${meta.buttonClassName ?? ''}`}
        >
          {sending ? (
            <Loader2
              className={`animate-spin ${mode === 'send' ? 'h-3 w-3' : 'h-4 w-4'}`}
            />
          ) : (
            <Icon className={mode === 'send' ? 'h-3 w-3' : 'h-4 w-4'} />
          )}
          {sending ? 'Envoi…' : buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
          {mode === 'test' ? (
            <TestFormBody
              type={type}
              email={email}
              onEmailChange={setEmail}
            />
          ) : (
            <SendFormBody
              type={type}
              email={email}
              onEmailChange={setEmail}
              customerName={customerName}
              onCustomerNameChange={setCustomerName}
              orderAmount={orderAmount}
              orderItems={orderItems}
              formatPrice={formatPrice}
              // Shipping
              carrier={carrier}
              onCarrierChange={setCarrier}
              trackingNumber={trackingNumber}
              onTrackingNumberChange={setTrackingNumber}
              trackingUrl={trackingUrl}
              onTrackingUrlChange={setTrackingUrl}
              estimatedDelivery={estimatedDelivery}
              onEstimatedDeliveryChange={setEstimatedDelivery}
              address={address}
              onAddressChange={setAddress}
              city={city}
              onCityChange={setCity}
              postalCode={postalCode}
              onPostalCodeChange={setPostalCode}
              // Delivery
              deliveryDate={deliveryDate}
              onDeliveryDateChange={setDeliveryDate}
              // Cancellation
              isRefund={isRefund}
              onIsRefundChange={setIsRefund}
              reason={reason}
              onReasonChange={setReason}
              refundMethod={refundMethod}
              onRefundMethodChange={setRefundMethod}
              refundDelay={refundDelay}
              onRefundDelayChange={setRefundDelay}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {mode === 'test' ? 'Envoyer le test' : 'Envoyer'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function humanType(type: OrderEmailType): string {
  switch (type) {
    case 'order-confirmation':
      return 'Confirmation de commande';
    case 'shipping':
      return "Notification d'expédition";
    case 'delivery':
      return 'Confirmation de livraison';
    case 'cancellation':
      return "Annulation / Remboursement";
  }
}

function loadingMessage(type: OrderEmailType, mode: Mode): string {
  const label = humanType(type);
  return mode === 'test'
    ? `Envoi de l'email de test — ${label}…`
    : `Envoi de l'email au client — ${label}…`;
}

function successMessage(type: OrderEmailType, isRefund: boolean): string {
  switch (type) {
    case 'shipping':
      return "Email d'expédition envoyé";
    case 'delivery':
      return 'Email de confirmation de livraison envoyé';
    case 'cancellation':
      return `Email ${isRefund ? 'de remboursement' : "d'annulation"} envoyé`;
    case 'order-confirmation':
      return 'Email de confirmation envoyé';
  }
}

function errorMessage(type: OrderEmailType, mode: Mode): string {
  const label = humanType(type);
  return mode === 'test'
    ? `Échec de l'envoi du test — ${label}`
    : `Échec de l'envoi au client — ${label}`;
}

// -----------------------------------------------------------------------------
// Sous-formulaires
// -----------------------------------------------------------------------------
interface TestFormBodyProps {
  type: OrderEmailType;
  email: string;
  onEmailChange: (v: string) => void;
}

function TestFormBody({ type, email, onEmailChange }: TestFormBodyProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`test-email-${type}`}>Adresse email de test</Label>
        <Input
          id={`test-email-${type}`}
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Note: Avec Resend en mode test, l'email sera envoyé uniquement à
          l'adresse associée à votre compte Resend.
        </p>
      </div>
      <TestPreview type={type} />
    </>
  );
}

function TestPreview({ type }: { type: OrderEmailType }): ReactNode {
  const wrapper = 'p-3 rounded-lg text-sm space-y-1';
  switch (type) {
    case 'order-confirmation':
      return (
        <div className={`${wrapper} bg-muted`}>
          <p className="font-medium">Données de test incluses:</p>
          <ul className="text-muted-foreground list-disc list-inside">
            <li>Chapeau de paille berbère (1x 45€)</li>
            <li>Sac à main tissé traditionnel (2x 65€)</li>
            <li>Sous-total: 175€</li>
            <li>Livraison: 5.90€</li>
            <li>Remise: -10€</li>
            <li>Total: 170.90€</li>
          </ul>
        </div>
      );
    case 'shipping':
      return (
        <div className={`${wrapper} bg-muted`}>
          <p className="font-medium">Données de test incluses:</p>
          <ul className="text-muted-foreground list-disc list-inside">
            <li>Transporteur: La Poste</li>
            <li>N° de suivi: 1Z999AA10123456784</li>
            <li>Livraison estimée: 15-18 janvier 2025</li>
            <li>2 articles: Chapeau + Sac</li>
            <li>Adresse: 123 Rue de Test, 75001 Paris</li>
          </ul>
        </div>
      );
    case 'delivery':
      return (
        <div className={`${wrapper} bg-green-50 dark:bg-green-950`}>
          <p className="font-medium text-green-900 dark:text-green-100">
            Données de test incluses:
          </p>
          <ul className="text-green-700 dark:text-green-300 list-disc list-inside">
            <li>Date de livraison: Aujourd'hui</li>
            <li>2 articles: Chapeau + Sac</li>
            <li>Lien vers les avis produits</li>
          </ul>
        </div>
      );
    case 'cancellation':
      return (
        <div className={`${wrapper} bg-red-50 dark:bg-red-950`}>
          <p className="font-medium text-red-900 dark:text-red-100">
            Données de test incluses:
          </p>
          <ul className="text-red-700 dark:text-red-300 list-disc list-inside">
            <li>Montant commande: 85,00 €</li>
            <li>Montant remboursé: 85,00 €</li>
            <li>Raison: Demande du client</li>
            <li>2 articles: Chapeau + Sac</li>
          </ul>
        </div>
      );
  }
}

interface SendFormBodyProps {
  type: OrderEmailType;
  email: string;
  onEmailChange: (v: string) => void;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  orderAmount: number;
  orderItems: OrderEmailOrderItem[];
  formatPrice: (n: number) => string;

  carrier: string;
  onCarrierChange: (v: string) => void;
  trackingNumber: string;
  onTrackingNumberChange: (v: string) => void;
  trackingUrl: string;
  onTrackingUrlChange: (v: string) => void;
  estimatedDelivery: string;
  onEstimatedDeliveryChange: (v: string) => void;
  address: string;
  onAddressChange: (v: string) => void;
  city: string;
  onCityChange: (v: string) => void;
  postalCode: string;
  onPostalCodeChange: (v: string) => void;

  deliveryDate: string;
  onDeliveryDateChange: (v: string) => void;

  isRefund: boolean;
  onIsRefundChange: (v: boolean) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  refundMethod: string;
  onRefundMethodChange: (v: string) => void;
  refundDelay: string;
  onRefundDelayChange: (v: string) => void;
}

function SendFormBody(props: SendFormBodyProps) {
  const {
    type,
    email,
    onEmailChange,
    customerName,
    onCustomerNameChange,
    orderAmount,
    orderItems,
    formatPrice,
  } = props;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Nom du client *</Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Jean Dupont"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email *</Label>
          <Input
            id="customerEmail"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="client@email.com"
          />
        </div>
      </div>

      {type === 'shipping' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Transporteur</Label>
              <Input
                id="carrier"
                value={props.carrier}
                onChange={(e) => props.onCarrierChange(e.target.value)}
                placeholder="La Poste"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">N° de suivi</Label>
              <Input
                id="trackingNumber"
                value={props.trackingNumber}
                onChange={(e) => props.onTrackingNumberChange(e.target.value)}
                placeholder="1Z999..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingUrl">URL de suivi</Label>
            <Input
              id="trackingUrl"
              value={props.trackingUrl}
              onChange={(e) => props.onTrackingUrlChange(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedDelivery">Date de livraison estimée</Label>
            <Input
              id="estimatedDelivery"
              value={props.estimatedDelivery}
              onChange={(e) =>
                props.onEstimatedDeliveryChange(e.target.value)
              }
              placeholder="15-18 janvier 2025"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={props.address}
              onChange={(e) => props.onAddressChange(e.target.value)}
              placeholder="123 Rue de Paris"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                id="postalCode"
                value={props.postalCode}
                onChange={(e) => props.onPostalCodeChange(e.target.value)}
                placeholder="75001"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={props.city}
                onChange={(e) => props.onCityChange(e.target.value)}
                placeholder="Paris"
              />
            </div>
          </div>
        </>
      )}

      {type === 'delivery' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Date de livraison</Label>
            <Input
              id="deliveryDate"
              value={props.deliveryDate}
              onChange={(e) => props.onDeliveryDateChange(e.target.value)}
              placeholder="30 décembre 2024"
            />
          </div>

          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
              Articles livrés:
            </p>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              {orderItems.map((item, index) => (
                <li key={index}>
                  ✓ {item.product_snapshot?.name || 'Produit'} × {item.quantity}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {type === 'cancellation' && (
        <>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label htmlFor="isRefund" className="font-medium">
                Remboursement
              </Label>
              <p className="text-xs text-muted-foreground">
                Inclure les détails du remboursement
              </p>
            </div>
            <Switch
              id="isRefund"
              checked={props.isRefund}
              onCheckedChange={props.onIsRefundChange}
            />
          </div>

          {props.isRefund && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Montant à rembourser: {formatPrice(orderAmount / 100)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="refundMethod" className="text-xs">
                    Mode de remboursement
                  </Label>
                  <Input
                    id="refundMethod"
                    value={props.refundMethod}
                    onChange={(e) => props.onRefundMethodChange(e.target.value)}
                    placeholder="Carte bancaire"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="refundDelay" className="text-xs">
                    Délai estimé
                  </Label>
                  <Input
                    id="refundDelay"
                    value={props.refundDelay}
                    onChange={(e) => props.onRefundDelayChange(e.target.value)}
                    placeholder="5-10 jours"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Raison (optionnel)</Label>
            <Textarea
              id="reason"
              value={props.reason}
              onChange={(e) => props.onReasonChange(e.target.value)}
              placeholder="Raison de l'annulation..."
              rows={2}
            />
          </div>
        </>
      )}
    </>
  );
}

export default OrderEmailActions;
