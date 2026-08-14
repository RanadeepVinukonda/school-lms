import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

interface AssistantCameraCaptureProps {
  onUse: (file: File) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

type CamState = 'starting' | 'live' | 'preview' | 'error';
type ErrType = 'permission' | 'unavailable' | null;

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export default function AssistantCameraCapture({ onUse, onCancel, isLoading }: AssistantCameraCaptureProps) {
  const { _ } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<CamState>('starting');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [errType, setErrType] = useState<ErrType>(null);
  const [retryKey, setRetryKey] = useState(0);
  const isCameraSupported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const stopStream = useCallback(() => {
    setStream((current) => {
      if (current) {
        current.getTracks().forEach((t) => t.stop());
      }
      return null;
    });
  }, []);

  const startCamera = useCallback(async () => {
    setStatus('starting');
    setErrType(null);
    if (!isCameraSupported) {
      setErrType('unavailable');
      setStatus('error');
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      setStatus('live');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      });
    } catch (err: any) {
      setErrType(err?.name === 'NotAllowedError' ? 'permission' : 'unavailable');
      setStatus('error');
    }
  }, [facingMode, isCameraSupported]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
      }
    };
    // Runs on mount, when the facing mode changes (camera switch), and when
    // the user hits "Try Again" (retryKey bump).
  }, [startCamera, retryKey]);

  const switchCamera = useCallback(() => {
    stopStream();
    setStatus('starting');
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, [stopStream]);

  const captureSnapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setPreviewBlob(blob);
        setPreviewSrc(URL.createObjectURL(blob));
        setStatus('preview');
        stopStream();
      }
    }, 'image/jpeg', 0.95);
  }, [stopStream]);

  const retake = useCallback(() => {
    if (previewSrc) {
      URL.revokeObjectURL(previewSrc);
    }
    setPreviewSrc(null);
    setPreviewBlob(null);
    setStatus('starting');
    startCamera();
  }, [previewSrc, startCamera]);

  const retryCamera = useCallback(() => {
    stopStream();
    if (previewSrc) {
      URL.revokeObjectURL(previewSrc);
    }
    setPreviewSrc(null);
    setPreviewBlob(null);
    setStatus('starting');
    setRetryKey((k) => k + 1);
  }, [previewSrc, stopStream]);

  const usePhoto = useCallback(() => {
    if (previewBlob) {
      const file = new File([previewBlob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onUse(file);
    }
  }, [previewBlob, onUse]);

  const handleNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) {
        onUse(file);
      }
    },
    [onUse],
  );

  const cancel = useCallback(() => {
    stopStream();
    onCancel();
  }, [stopStream, onCancel]);

  return (
    <div

      className="rounded-xl border border-border/60 bg-surface/50 overflow-hidden"
    >
      {status === 'preview' && previewSrc ? (
        <div className="p-3">
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
            <img src={previewSrc} alt={_('Captured photo')} className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button variant="outline" onClick={retake} disabled={isLoading} className="flex-1 max-w-[160px]">
              <Icon name="refresh" size={18} className="mr-1.5" />
              {_('Retake')}
            </Button>
            <Button onClick={usePhoto} disabled={isLoading} className="flex-1 max-w-[160px]">
              <Icon name="check" size={18} className="mr-1.5" />
              {_('Use Photo')}
            </Button>
            <Button variant="ghost" onClick={cancel} disabled={isLoading} aria-label={_('Cancel')}>
              <Icon name="close" size={18} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
            {status === 'live' && stream ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant gap-3 p-4 text-center">
                <Icon name="photo_camera" size={44} />
                <p className="text-sm">
                  {status === 'starting'
                    ? _('Starting camera...')
                    : errType === 'permission'
                      ? _('Camera permission was denied. Please allow camera access and try again, or upload an image instead.')
                      : _('Could not access the camera on this device. Try the camera app on your phone, or upload an image instead.')}
                </p>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {status === 'error' && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <Button variant="secondary" onClick={retryCamera}>
                <Icon name="refresh" size={18} className="mr-1.5" />
                {_('Try Again')}
              </Button>
              <Button variant="outline" onClick={() => nativeInputRef.current?.click()}>
                <Icon name="upload_file" size={18} className="mr-1.5" />
                {_('Choose Image')}
              </Button>
              <Button variant="ghost" onClick={cancel}>
                {_('Cancel')}
              </Button>
            </div>
          )}

          {status === 'live' && (
            <>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="icon" onClick={switchCamera} title={_('Switch camera')} disabled={isLoading || !stream}>
                  <Icon name="flip_camera_android" size={20} />
                </Button>
                <Button onClick={captureSnapshot} disabled={isLoading || !stream}>
                  <Icon name="photo_camera" size={18} className="mr-1.5" />
                  {_('Capture')}
                </Button>
                {isMobileDevice() && (
                  <Button variant="outline" size="icon" onClick={() => nativeInputRef.current?.click()} title={_('Open device camera')}>
                    <Icon name="video_camera_back" size={20} />
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <Button variant="ghost" size="sm" onClick={cancel} disabled={isLoading}>
                  <Icon name="close" size={16} className="mr-1" />
                  {_('Cancel')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => nativeInputRef.current?.click()} disabled={isLoading}>
                  <Icon name="photo_library" size={16} className="mr-1" />
                  {_('Gallery')}
                </Button>
              </div>
            </>
          )}

          {status === 'starting' && (
            <div className="mt-3 text-center">
              <Button variant="ghost" onClick={cancel} disabled={isLoading}>
                {_('Cancel')}
              </Button>
            </div>
          )}

          <input
            ref={nativeInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeChange}
          />
        </div>
      )}
    </div>
  );
}