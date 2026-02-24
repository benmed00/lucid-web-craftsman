import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Store, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface LocationBasedFeaturesProps {
  onLocationChange?: (location: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
}

interface StoreLocation {
  id: string;
  name: string;
  address: string;
  distance?: number;
  phone: string;
  hours: string;
  isOpen: boolean;
}

export const LocationBasedFeatures = ({
  onLocationChange,
}: LocationBasedFeaturesProps) => {
  const [currentLocation, setCurrentLocation] =
    useState<GeolocationPosition | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<StoreLocation[]>([]);
  const [deliveryEstimate, setDeliveryEstimate] = useState<string | null>(null);

  const mockStores: StoreLocation[] = [
    {
      id: '1',
      name: 'Boutique Rif Raw Straw - Centre',
      address: '123 Rue Mohammed V, Rabat',
      distance: 2.3,
      phone: '+212 537 123456',
      hours: '9h00 - 19h00',
      isOpen: true,
    },
    {
      id: '2',
      name: 'Boutique Rif Raw Straw - Agdal',
      address: '45 Avenue Hassan II, Agdal',
      distance: 4.1,
      phone: '+212 537 654321',
      hours: '10h00 - 20h00',
      isOpen: true,
    },
    {
      id: '3',
      name: 'Partenaire - Artisanat du Maroc',
      address: '78 Boulevard Al Hansali, Hay Riad',
      distance: 6.8,
      phone: '+212 537 987654',
      hours: '9h30 - 18h30',
      isOpen: false,
    },
  ];

  useEffect(() => {
    // Auto-detect location if user has previously allowed it
    const savedLocation = localStorage.getItem('user-location');
    if (savedLocation) {
      const location = JSON.parse(savedLocation);
      setCurrentLocation(location);
      updateLocationBasedFeatures(location);
    }
  }, []);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Géolocalisation non supportée',
        description: 'Votre navigateur ne supporte pas la géolocalisation',
        variant: 'destructive',
      });
      return;
    }

    setIsGettingLocation(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setCurrentLocation(position);
        localStorage.setItem('user-location', JSON.stringify(position));

        // Get address from coordinates
        const address = await reverseGeocode(
          position.coords.latitude,
          position.coords.longitude
        );

        onLocationChange?.({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address,
        });

        updateLocationBasedFeatures(position);
        setIsGettingLocation(false);

        toast({
          title: 'Localisation activée',
          description:
            'Nous pouvons maintenant vous proposer les meilleures options de livraison',
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsGettingLocation(false);

        let errorMessage = 'Erreur de géolocalisation';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai de géolocalisation dépassé';
            break;
        }

        toast({
          title: 'Erreur de localisation',
          description: errorMessage,
          variant: 'destructive',
        });
      },
      options
    );
  };

  const updateLocationBasedFeatures = (position: GeolocationPosition) => {
    // Calculate distances to stores and sort by proximity
    const storesWithDistance = mockStores
      .map((store) => ({
        ...store,
        distance: calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          33.9716, // Mock store coordinates
          -6.8498
        ),
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));

    setNearbyStores(storesWithDistance);

    // Estimate delivery time based on distance to nearest store
    const nearestStore = storesWithDistance[0];
    if (nearestStore && nearestStore.distance) {
      if (nearestStore.distance < 5) {
        setDeliveryEstimate('Livraison sous 2-3h');
      } else if (nearestStore.distance < 15) {
        setDeliveryEstimate('Livraison sous 24h');
      } else {
        setDeliveryEstimate('Livraison sous 2-3 jours');
      }
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // In a real app, use a geocoding service like Google Maps API
      // For demo, return a mock address
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Localisation inconnue';
    }
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <div className="space-y-4">
      {/* Location Request Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-olive-600" />
            Ma localisation
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!currentLocation ? (
            <div className="text-center py-4">
              <p className="text-stone-600 mb-4 text-sm">
                Activez la géolocalisation pour obtenir les meilleures options
                de livraison et trouver nos boutiques près de chez vous.
              </p>
              <Button
                onClick={requestLocation}
                disabled={isGettingLocation}
                className="bg-olive-700 hover:bg-olive-800 text-white"
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Localisation...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Activer la géolocalisation
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Localisation activée
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  Précis
                </Badge>
              </div>

              {deliveryEstimate && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    {deliveryEstimate}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nearby Stores */}
      {nearbyStores.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5 text-olive-600" />
              Boutiques à proximité
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {nearbyStores.slice(0, 3).map((store) => (
                <div
                  key={store.id}
                  className="flex items-start gap-3 p-3 border border-stone-200 rounded-lg"
                >
                  <Store className="h-5 w-5 text-stone-400 mt-0.5" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-stone-800 text-sm truncate">
                        {store.name}
                      </h4>
                      <Badge
                        variant={store.isOpen ? 'default' : 'secondary'}
                        className={`text-xs ${
                          store.isOpen
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {store.isOpen ? 'Ouvert' : 'Fermé'}
                      </Badge>
                    </div>

                    <p className="text-stone-600 text-xs mb-1">
                      {store.address}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span>{store.hours}</span>
                      {store.distance && (
                        <span>• {store.distance.toFixed(1)} km</span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`tel:${store.phone}`)}
                    className="text-xs px-3 py-1 h-8"
                  >
                    Appeler
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
