import React from 'react';

interface TravelFaviconProps {
  size?: number; // Optional prop for size in pixels
  className?: string; // Optional prop for additional CSS classes
}

const TravelFavicon: React.FC<TravelFaviconProps> = ({ size = 32, className }) => {
  // You can choose which favicon size to use based on the 'size' prop
  // or you can have a more sophisticated logic here.
  // For simplicity, let's use the 32x32 size by default.
  const faviconSrc = `/icons/travel_favicon_${size}px.ico`; // Assuming your favicons are named like this

  // You might want to add a fallback or error handling for missing sizes

  return (
    <img
      src={faviconSrc}
      alt="Travel Favicon"
      width={size}
      height={size}
      className={className}
    />
  );
};

export default TravelFavicon;

