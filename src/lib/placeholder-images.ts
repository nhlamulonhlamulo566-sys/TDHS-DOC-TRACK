import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// This is now an empty array, but we keep the file to avoid breaking imports
// that might be added back later.
export const PlaceHolderImages: ImagePlaceholder[] = [];
