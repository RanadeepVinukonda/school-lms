import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import SplashScreen from '@/components/common/SplashScreen';
import UploadProgressBanner from '@/components/textbook/UploadProgressBanner';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <SplashScreen isLoading={showSplash} onFinish={() => setShowSplash(false)} />
      <UploadProgressBanner />
      <RouterProvider router={router} />
    </>
  );
}
