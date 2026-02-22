import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  address?: string;
  businessName?: string;
  className?: string;
}

const LocationMap = ({
  latitude,
  longitude,
  zoom = 15,
  address,
  businessName,
  className = '',
}: LocationMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isClient, setIsClient] = useState(false);

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize Leaflet map directly (bypassing react-leaflet context issues)
  useEffect(() => {
    if (!isClient || !mapContainerRef.current || mapInstanceRef.current) return;

    // Create the map instance
    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: zoom,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Create custom icon
    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    // Add marker with popup
    const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(
      map
    );

    const popupContent = `
      <div style="text-align: center; padding: 4px;">
        <strong style="display: block; margin-bottom: 4px;">${businessName}</strong>
        <span style="font-size: 12px; color: #666;">${address}</span>
        <button 
          onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}', '_blank', 'noopener,noreferrer')"
          style="margin-top: 8px; width: 100%; font-size: 12px; background: hsl(var(--primary)); color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer;"
        >
          Obtenir l'itinéraire
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, latitude, longitude, zoom, address, businessName]);

  // Show loading state until client-side
  if (!isClient) {
    return (
      <div className={`relative ${className}`}>
        <div
          className="h-full w-full rounded-lg bg-muted animate-pulse flex items-center justify-center"
          style={{ minHeight: '400px' }}
        >
          <span className="text-muted-foreground">
            Chargement de la carte...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainerRef}
        className="h-full w-full rounded-lg"
        style={{ minHeight: '400px' }}
      />

      {/* Overlay button for directions */}
      <button
        onClick={handleGetDirections}
        className="absolute bottom-4 right-4 z-[1000] bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105"
        aria-label="Obtenir l'itinéraire vers notre boutique"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 11l19-9-9 19-2-8-8-2z" />
        </svg>
        Itinéraire
      </button>
    </div>
  );
};

export default LocationMap;
