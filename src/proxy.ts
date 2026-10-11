export { default as proxy } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * Protège toutes les routes sauf :
     * - /login (page de connexion)
     * - /mot-de-passe-oublie, /reinitialiser-mot-de-passe
     * - /api/auth/* (routes NextAuth)
     * - /_next/*, fichiers statiques
     */
    '/((?!login|mot-de-passe-oublie|reinitialiser-mot-de-passe|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
