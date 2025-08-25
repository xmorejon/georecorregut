'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import GeoJsonLayer from '../map/geojson-layer';
import { useTheme } from 'next-themes';
import { useAppContext } from '@/contexts/app-context';

export default function InteractiveMap() {
  const { locations, selectedLocation, setSelectedLocation, activeTab, setSearchTerm } = useAppContext();
  const [countriesGeoJSON, setCountriesGeoJSON] = useState<any>(null);
  const favoritePinColor = {
    background: 'hsl(var(--destructive))',
    borderColor: 'hsl(var(--destructive-foreground))',
    glyphColor: 'hsl(var(--destructive-foreground))',
  };
  const defaultPinColor = { background: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary-foreground))', glyphColor: 'hsl(var(--primary-foreground))' };
  const [showGeoJsonLayer, setShowGeoJsonLayer] = useState(false);

  useEffect(() => {
    fetch('/geo/countries.geojson')
      .then((res) => res.json())
      .then((data) => setCountriesGeoJSON(data));
  }, []);
  const visitedCountries = useMemo(() => {
    if (!countriesGeoJSON || !locations) return null;

    const visitedCountryNames = new Set(locations.map(location => location.country.toLowerCase()));
    console.log('Visited Countries Set:', visitedCountryNames);

    return {
      type: 'FeatureCollection',
      features: countriesGeoJSON.features.filter((feature: any) => {
          return visitedCountryNames.has(feature.properties.name.toLowerCase()); // Assuming the country name property is 'name'
        }
      ),
    };
  }, [countriesGeoJSON, locations]);

  const countryLayerOptions = useMemo(() => {
    return {
      id: 'visited-countries',
      data: visitedCountries,
      strokeWeight: 1,
    fillColor: '#FF7F7F', // Using the primary color for visited countries
    fillOpacity: 0.5,
    };
  }, [visitedCountries]);


  const [mapCenter, setMapCenter] = useState({ lat: 41.3851, lng: 2.1734 });
  const [zoom, setZoom] = useState(3);

  // Calculate pin scale based on zoom level
  const pinScale = useMemo(() => {
    // Adjust these values to control the scaling behavior
    const minScale = 0.7;
    const maxScale = 1.3;
    return minScale + (maxScale - minScale) * ((zoom - 3) / (12 - 3)); // Assuming min zoom 3 and max zoom 12 for scaling
  }, [zoom]);
  useEffect(() => {
    if (selectedLocation) {
      setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      setZoom(12);
    }
  }, [selectedLocation]);

  useEffect(() => {
    setShowGeoJsonLayer(!!countriesGeoJSON && !!visitedCountries);
  }, [countriesGeoJSON, visitedCountries]);

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return 1;
      if (!a.isFavorite && b.isFavorite) return -1;
      return 0;
    });
  }, [locations]);

  const { theme } = useTheme();
  const mapColorScheme = theme === 'dark' ? 'dark' : 'light';
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div>Current Theme: {theme}</div>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1 }}>
        <div className="flex flex-col space-y-1">
          <Button size="sm" className="h-8 w-8" onClick={() => setZoom(zoom + 1)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </Button>
          <Button size="sm" className="h-8 w-8" 
            onClick={() => { 
                if (zoom > 1) {
                  setZoom(zoom - 1);
                }
            }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </Button>
          <Button size="sm" className="h-8 w-8" onClick={() => navigator.geolocation.getCurrentPosition((position) => { setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude }); setZoom(12); })}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-6h.01M12 6a9 9 0 110 18 9 9 0 010-18zm0 6a3 3 0 110 6 3 3 0 010-6z" />
            </svg>
          </Button>
        </div>
      </div>
      <Map
        key={theme} // Add the theme as the key
        center={mapCenter}
        zoom={zoom}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        onCameraChanged={(ev) => {

            setZoom(ev.detail.zoom);
            setMapCenter(ev.detail.center);
        }}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
 colorScheme={mapColorScheme as google.maps.ColorScheme}
        minZoom={1}
      >
        {activeTab !== 'statistics' &&

          sortedLocations.map((location) => (
            <AdvancedMarker
              key={location.id}
              position={{ lat: location.lat, lng: location.lng }}
              onClick={() => {
                setSelectedLocation(location);
                setSearchTerm(location.name);
              }}
            >
                <Pin {...(location.isFavorite ? favoritePinColor : defaultPinColor)}
                  scale={pinScale}
                />
            </AdvancedMarker>
          ))}
        {showGeoJsonLayer && (
            <GeoJsonLayer key={visitedCountries?.features.length} data={countryLayerOptions.data} options={countryLayerOptions} />
        )}
      </Map>
    </div>
  );
}
