import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import router from './routes';
import { Toaster } from 'react-hot-toast';
import { toastOptions } from './utils/toast';
import AppErrorBoundary from './pages/errors/AppErrorBoundary';

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);
  useEffect(() => { void checkAuth(); }, [checkAuth]);
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={toastOptions}
      />
    </AppErrorBoundary>
  );
}

export default App;
