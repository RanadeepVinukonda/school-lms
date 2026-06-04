import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import SplashScreen from '@/components/common/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <SplashScreen isLoading={showSplash} onFinish={() => setShowSplash(false)} />
      <RouterProvider router={router} />
    </>
  );
}
