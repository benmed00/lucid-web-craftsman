// File_name: src/utils/__tests__/getImageUrl.test.ts

/* Description: This file is used to test the getImageUrl function
 * getImageUrl fait la distinction entre environnement dev/prod ✅
 */

import { describe, it, expect } from 'vitest';
import { getImageUrl } from '../imageUtils';


type TestCase = {
  name: string;        // Description of the test case
  filename: string;    // The input filename
  baseUrl?: string;    // Optional base URL
  expected: string;    // Expected output
};

const testCases: TestCase[] = [
  {
    name: 'avec baseUrl traînant',
    filename: 'photo.png',
    baseUrl: '/mon-app/',
    expected: '/mon-app/assets/images/photo.png',
  },
  {
    name: 'avec baseUrl sans slash final',
    filename: 'snapshot.jpg',
    baseUrl: '/storage',
    expected: '/storage/assets/images/snapshot.jpg',
  },
  {
    name: 'avec baseUrl vide',
    filename: 'test.jpg',
    baseUrl: '',
    expected: '/assets/images/test.jpg',
  },
  {
    name: 'baseUrl undefined ou vide',
    filename: 'test.jpg',
    baseUrl: undefined,
    expected: '/assets/images/test.jpg',
  },
  {
    name: 'filename null ou undefined',
    filename: null,
    baseUrl: '/site/',
    expected: '/site/assets/images/',
  },
  {
    name: 'avec baseUrl contenant plusieurs slashs',
    filename: 'logo.svg',
    baseUrl: '/app//',
    expected: '/app/assets/images/logo.svg',
  },
  {
    name: 'avec baseUrl = "/"',
    filename: 'icon.svg',
    baseUrl: '/',
    expected: '/assets/images/icon.svg',
  },
  {
    name: 'filename commençant par slash',
    filename: '/banner.png',
    baseUrl: '/site/',
    expected: '/site/assets/images/banner.png',
  },
  {
    name: 'avec sous-répertoires dans filename',
    filename: 'blog/thumbnails/thumb.jpg',
    baseUrl: '/media/',
    expected: '/media/assets/images/blog/thumbnails/thumb.jpg',
  },
  {
    name: 'avec caractères spéciaux',
    filename: 'çè%20image avec espace.jpg',
    baseUrl: '/cdn/',
    expected: '/cdn/assets/images/çè%20image avec espace.jpg',
  },
  {
    name: 'avec filename vide',
    filename: '',
    baseUrl: '/empty/',
    expected: '/empty/assets/images/',
  },
  {
    name: 'avec baseUrl vide',
    filename: 'test.jpg',
    baseUrl: '',
    expected: '/assets/images/test.jpg',
  },
  {
    name: 'avec caractères spéciaux dans le filename',
    filename: 'çè%20image avec espace.jpg',
    baseUrl: '/cdn/',
    expected: '/cdn/assets/images/çè%20image avec espace.jpg',
  },
  {
    name: 'baseUrl undefined ou vide',
    filename: 'test.svg',
    baseUrl: undefined,
    expected: '/assets/images/test.svg',
  },
];

describe('getImageUrl', () => {
  for (const { name, filename, baseUrl, expected } of testCases) {
    it(`devrait construire l’URL correctement ${name}`, () => {
      const url = getImageUrl(filename, baseUrl);
      expect(url).toBe(expected);
    });
  }

  it('devrait utiliser import.meta.env.BASE_URL comme base par défaut', () => {
    // Ceci pourrait être mieux simulé avec un mock/stub si nécessaire.
    const filename = 'default.png';
    const url = getImageUrl(filename);
    expect(url).toBe('/assets/images/default.png');
  });
});

/**
 * 🔍 Suite de tests unitaires pour la fonction utilitaire getImageUrl.
 * Cette fonction construit un chemin d’image local basé sur :
 * - un nom de fichier (`filename`)
 * - un chemin de base optionnel (`baseUrl`)
 *
 * La fonction est conçue pour être robuste face aux cas réels
 * d’utilisation en production, notamment dans un contexte de déploiement
 * sur GitHub Pages ou d’utilisation de `import.meta.env.BASE_URL`.
 */
describe('getImageUrl(filename, baseUrl?)', () => {

  it('devrait ignorer le slash initial de filename', () => {
    const filename = '/banner.png';
    const baseUrl = '/site/';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/site/assets/images/banner.png'); // ✅ normalisé
  });

  it('devrait normaliser baseUrl sans slash et filename avec slash', () => {
    const filename = '/visual.jpg';
    const baseUrl = '/app';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/app/assets/images/visual.jpg');
  });

  // Cas standard : baseUrl fourni avec slash final
  it('devrait construire le chemin complet avec baseUrl traînant', () => {
    const filename = 'photo.png';
    const baseUrl = '/mon-app/';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/mon-app/assets/images/photo.png');
  });

  // Cas standard : baseUrl sans slash final
  it('devrait construire le chemin complet avec baseUrl sans slash final', () => {
    const filename = 'snapshot.jpg';
    const baseUrl = '/storage';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/storage/assets/images/snapshot.jpg');
  });

  // Cas : baseUrl avec double slash à normaliser
  it('devrait normaliser plusieurs slashs en baseUrl', () => {
    const filename = 'logo.svg';
    const baseUrl = '/app//';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/app/assets/images/logo.svg');
  });

  // Cas : baseUrl défini comme "/"
  it('devrait ajouter un slash de base même si baseUrl = "/"', () => {
    const filename = 'icon.svg';
    const baseUrl = '/';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/assets/images/icon.svg');
  });

  // Cas : filename commence déjà par un slash
  it('devrait gérer un filename commençant par slash', () => {
    const filename = '/banner.png';
    const baseUrl = '/site/';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/site/assets/images/banner.png');
  });

  // Cas : baseUrl non défini (utilise import.meta.env.BASE_URL par défaut)
  it('devrait utiliser import.meta.env.BASE_URL comme base par défaut', () => {
    const filename = 'default.png';
    const url = getImageUrl(filename);
    expect(url).toBe('/assets/images/default.png'); // BASE_URL = '/'
  });

  // Cas : filename avec sous-dossiers
  it('devrait gérer un filename avec des sous-répertoires', () => {
    const filename = 'blog/thumbnails/thumb.jpg';
    const baseUrl = '/media/';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/media/assets/images/blog/thumbnails/thumb.jpg');
  });

  // Cas : filename vide, retourne chemin du dossier
  it('devrait retourner le chemin du dossier si filename est vide', () => {
    const filename = '';
    const baseUrl = '/empty/';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/empty/assets/images/');
  });

  // Cas : baseUrl est une chaîne vide
  it('devrait se comporter comme BASE_URL si baseUrl est une chaîne vide', () => {
    const filename = 'test.jpg';
    const baseUrl = '';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/assets/images/test.jpg');
  });

  // Cas : caractères spéciaux dans le nom de fichier
  it('devrait préserver les caractères spéciaux dans le nom de fichier', () => {
    const filename = 'çè%20image avec espace.jpg';
    const baseUrl = '/cdn/';
    const url = getImageUrl(filename, baseUrl);
    expect(url).toBe('/cdn/assets/images/çè%20image avec espace.jpg');
  });

  // Cas : baseUrl undefined ou vide, revient à BASE_URL = "/"
  it('devrait utiliser "/" comme base si baseUrl est undefined ou vide', () => {
    const filename = 'test.svg';
    const url1 = getImageUrl(filename);      // baseUrl undefined
    const url2 = getImageUrl(filename, '');  // baseUrl empty string
    expect(url1).toBe('/assets/images/test.svg');
    expect(url2).toBe('/assets/images/test.svg');
  });

  // Cas : filename null ou undefined => retourne dossier uniquement
  it('devrait retourner le chemin du dossier si filename est null ou undefined', () => {
    const url1 = getImageUrl(null as unknown as string, '/x/');
    const url2 = getImageUrl(undefined as unknown as string, '/x/');
    expect(url1).toBe('/x/assets/images/');
    expect(url2).toBe('/x/assets/images/');
  });
});
