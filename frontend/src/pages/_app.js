import { AuthProvider } from '../context/AuthContext';
import Layout from '../components/Layout/Layout';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';

/**
 * Next.js App Component
 * Root component with global providers and layout
 */
function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: 'green',
                secondary: 'black',
              },
            },
            error: {
              duration: 4000,
              theme: {
                primary: 'red',
                secondary: 'black',
              },
            },
          }}
        />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;