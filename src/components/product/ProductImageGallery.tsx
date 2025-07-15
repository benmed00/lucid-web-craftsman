import React, { useState } from 'react';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({ images, productName }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  if (!images || images.length === 0) {
    // Optional: render a placeholder if no images are available
    return <div className="aspect-ratio aspect-w-1 aspect-h-1 mb-4 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center"><p>No image available</p></div>;
  }

  return (
    <div>
      <div className="aspect-ratio aspect-w-1 aspect-h-1 mb-4 overflow-hidden rounded-lg">
        <img
          src={images[selectedImage]}
          alt={`${productName} - image ${selectedImage + 1}`}
          className="object-cover w-full h-full"
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image: string, idx: number) => (
            <div
              key={idx}
              className={`aspect-ratio aspect-w-1 aspect-h-1 rounded-md overflow-hidden cursor-pointer border-2
                ${
                  selectedImage === idx
                    ? "border-olive-500" // Assuming olive-500 is the active border color
                    : "border-transparent"
                }`}
              onClick={() => setSelectedImage(idx)}
            >
              <img
                src={image}
                alt={`${productName} - vue ${idx + 1}`}
                className="object-cover w-full h-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
