export { default as brand } from '../../../config/brand.json';
export const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';
