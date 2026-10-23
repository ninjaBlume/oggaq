// Applies the saved theme before the first paint (see src/theme.tsx). A separate file, not an inline script, so that the production Content-Security-Policy can stay script-src 'self'.
try{var t=localStorage.getItem('oggaq-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}
