import { RouterProvider } from 'react-router-dom';
import router from './routes';
import { Toaster } from 'react-hot-toast';
import { toastOptions } from './utils/toast';
import AppErrorBoundary from './pages/errors/AppErrorBoundary';

function App() {
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
