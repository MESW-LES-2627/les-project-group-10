import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/auth/authContext';
import type { AuthContextValue } from '@/auth/authContext';

export interface RenderWithProvidersOptions {
  /** Initial router path, for components that read route params or build links. */
  route?: string;
  /** Provide a fake `AuthContext` value for components that call `useAuth()`. */
  authValue?: AuthContextValue;
}

/**
 * Renders a component wrapped in a `MemoryRouter` (every page/component here
 * can use `Link`/`useNavigate`), and optionally an `AuthContext.Provider`
 * for components that read the logged-in user via `useAuth()`.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', authValue }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    const content = <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
    return authValue ? (
      <AuthContext.Provider value={authValue}>{content}</AuthContext.Provider>
    ) : (
      content
    );
  }

  return render(ui, { wrapper: Wrapper });
}
