import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface GeoJsonLayerProps {
  data: any | null;
  options?: google.maps.Data.StyleOptions | ((feature: google.maps.Data.Feature) => google.maps.Data.StyleOptions);
}

const GeoJsonLayer: React.FC<GeoJsonLayerProps> = ({ data, options }) => {
  const map = useMap();
  const [dataLayer, setDataLayer] = React.useState<google.maps.Data | null>(null);

  useEffect(() => {
    if (!map || !data) return;

    if (dataLayer) {
      // Explicitly clear existing features before adding new ones
 dataLayer.forEach(feature => dataLayer.remove(feature));
      // Remove the data layer from the map before creating a new one
      dataLayer.setMap(null);
    }

    const layer = new google.maps.Data();
    layer.addGeoJson(data);

    if (options) {
      layer.setStyle(options);
    }

    layer.setMap(map);
    setDataLayer(layer);

    return () => {
      if (dataLayer) {
        dataLayer.setMap(null);
      }
    };
  }, [map, data, options]);

  return null; // This component doesn't render any visual elements directly
};

export default GeoJsonLayer;