import { useState, useEffect } from 'react';
import type { RefObject } from 'react';

export function useWebcam(videoRef: RefObject<HTMLVideoElement | null>) {
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Request back camera
          }
        });
        
        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setIsActive(true);
        } else {
          // If unmounted while fetching, clean up immediately
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Camera access denied');
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef]);

  return { error, isActive };
}
