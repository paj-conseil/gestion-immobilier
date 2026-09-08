export { default as proxy } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * Protège toutes les routes sauf :
     * - /login (page de connexion)
     * - /api/auth/* (routes NextAuth)
     * - /_next/*, fichiers statiques
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
