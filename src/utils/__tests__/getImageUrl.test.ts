// src/utils/__tests__/getImageUrl.test.ts
// import { getImageUrl } from '../getImageUrl';

import { getImageUrl } from "../imageUtils";

describe('getImageUrl', () => {
  it('devrait générer le bon chemin avec BASE_URL défini', () => {
    const originalBaseUrl = import.meta.env.BASE_URL;
    // Mock de l'environnement
    import.meta.env.BASE_URL = '/lucid-web-craftsman/';
    expect(getImageUrl('image.jpg')).toBe('/lucid-web-craftsman/assets/images/image.jpg');
    // Restaure l’original
    import.meta.env.BASE_URL = originalBaseUrl;
  });

  it('devrait générer le bon chemin avec BASE_URL vide', () => {
    const originalBaseUrl = import.meta.env.BASE_URL;
    import.meta.env.BASE_URL = '/';
    expect(getImageUrl('image.jpg')).toBe('/assets/images/image.jpg');
    import.meta.env.BASE_URL = originalBaseUrl;
  });
});
