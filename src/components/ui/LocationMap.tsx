import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in React-Leaflet
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  address?: string;
  businessName?: string;
  className?: string;
}

const LocationMap = ({
  latitude = 48.8606,
  longitude = 2.3376,
  zoom = 15,
  address = "123 Rue de l'Artisan, 75001 Paris",
  businessName = "Rif Raw Straw",
  className = "",
}: LocationMapProps) => {
  const mapRef = useRef<L.Map | null>(null);

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        ref={mapRef}
        className="h-full w-full rounded-lg"
        style={{ minHeight: '400px' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={customIcon}>
          <Popup>
            <div className="text-center p-1">
              <strong className="block text-foreground">{businessName}</strong>
              <span className="text-sm text-muted-foreground">{address}</span>
              <button
                onClick={handleGetDirections}
                className="mt-2 w-full text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/90 transition-colors"
              >
                Obtenir l'itinéraire
              </button>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Overlay button for directions */}
      <button
        onClick={handleGetDirections}
        className="absolute bottom-4 right-4 z-[1000] bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105"
        aria-label="Obtenir l'itinéraire vers notre boutique"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l19-9-9 19-2-8-8-2z" />
        </svg>
        Itinéraire
      </button>
    </div>
  );
};

export default LocationMap;
