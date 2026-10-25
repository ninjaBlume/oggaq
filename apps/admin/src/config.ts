import productBrand from '../../../config/brand.json';

export const brand = { ...productBrand, title: 'İçerik yönetimi' };

export const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';
