// Answers the password-backup form POST locally, so Safari offers to save the login without
// the player key ever being sent anywhere. Redirects back to the game.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/save-data')) {
    event.respondWith(Response.redirect(new URL('./?pwsaved=1', self.registration.scope).href, 303));
  }
});
