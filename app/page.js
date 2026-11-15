import HomeContent from '@/components/house/HomeContent';
import HouseLoader from '@/components/house/HouseLoader';

// The home page is the house. Underneath it, the same content as plain HTML,
// for search engines, screen readers and devices without WebGL.
export default function Home() {
  return (
    <>
      <HomeContent />
      <HouseLoader />
      <noscript>
        <style>{'#house{display:none!important}'}</style>
      </noscript>
    </>
  );
}
