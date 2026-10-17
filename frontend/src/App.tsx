import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/router';

/**
 * Root component: mounts the app router.
 */
export default function App() {
  return <RouterProvider router={router} />;
}
