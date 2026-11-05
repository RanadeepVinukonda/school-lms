import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onFileUpload: (file: File) => void;
  isLoading?: boolean;
}

export default function CameraCapture({ onCapture, onFileUpload, isLoading }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError('Camera not available. Use file upload instead.');
    }
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  const switchCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, [stream]);

  const toggleFlash = useCallback(() => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      if (capabilities.torch) {
        track.applyConstraints({ advanced: [{ torch: !flashOn } as unknown as MediaTrackConstraintSet] })
          .then(() => setFlashOn(!flashOn))
          .catch(() => {});
      }
    }
  }, [stream, flashOn]);

  const captureSnapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCapturedImage(URL.createObjectURL(blob));
      }
    }, 'image/jpeg', 0.95);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedBlob) {
      onCapture(capturedBlob);
    }
  }, [capturedBlob, onCapture]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileUpload(file);
      }
    },
    [onFileUpload],
  );

  const isCameraSupported = !!(navigator.mediaDevices?.getUserMedia);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {!capturedImage ? (
          <div className="space-y-4">
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-3">
                  <Icon name="photo_camera" size={48} />
                  <p className="text-sm text-center">
                    {cameraError || (isCameraSupported ? 'Camera preview' : 'Camera not supported on this device')}
                  </p>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {isCameraSupported && (
              <div className="flex items-center justify-center gap-3">
                {!stream ? (
                  <Button onClick={startCamera} disabled={isLoading}>
                    <Icon name="videocam" size={18} className="mr-1" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="icon" onClick={switchCamera} title="Switch camera">
                      <Icon name="flip_camera_android" size={20} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={toggleFlash} title="Toggle flash">
                      <Icon name={flashOn ? 'flash_on' : 'flash_off'} size={20} />
                    </Button>
                    <Button onClick={captureSnapshot} disabled={isLoading}>
                      <Icon name="photo_camera" size={18} className="mr-1" />
                      Capture
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-outline-variant" />
              <span className="text-label-sm text-on-surface-variant">or</span>
              <div className="flex-1 border-t border-outline-variant" />
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                <Icon name="upload_file" size={18} className="mr-1" />
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={retake} disabled={isLoading}>
                <Icon name="refresh" size={18} className="mr-1" />
                Retake
              </Button>
              <Button onClick={confirmCapture} disabled={isLoading}>
                <Icon name="check" size={18} className="mr-1" />
                {isLoading ? 'Processing...' : 'Confirm & Scan'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
