# Mobile navigation update

This is a full source-tree snapshot of the prior upgraded project, with a mobile hamburger navigation drawer. The shared sidebar stays visible on large screens (`lg` breakpoint); on smaller screens, a sticky header provides a menu button, a backdrop, Escape-to-close, route-change closing, and a bottom-aligned sign-out section. `app/(protected)/layout.tsx` includes `min-w-0` on main to reduce horizontal overflow.

## Deploy safely

1. Back up your live repository and Supabase data.
2. Compare this snapshot against your **current GitHub main branch** before replacing any files. It is derived from the previously uploaded upgrade ZIP, and may not contain subsequent changes made directly on GitHub. The only files intentionally modified for this request are `components/nav.tsx`, `components/mobile-navigation.tsx` (new), and `app/(protected)/layout.tsx` plus this note. Prefer copying only those navigation files into your current repository.
3. No SQL migration is necessary for the hamburger menu.
4. Run `npm install` and `npm run build`, then commit/push. The build has not been verified in this environment.
5. Validate on a phone: open/close menu, click a navigation link, Escape, backdrop, scroll, logout and desktop sidebar.

Do not commit `.env.local` or Supabase secret keys.
