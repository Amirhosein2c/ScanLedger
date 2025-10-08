import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav.jsx';
import '../styles/documentScan.css';

const DocumentScan = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Only image capture is supported in this build.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setError(null);
      try {
        sessionStorage.setItem('scannedImageDataUrl', reader.result);
        localStorage.setItem('scannedImageDataUrl', reader.result);
      } catch (storageError) {
        console.warn('Unable to store preview in session storage', storageError);
      }
    };
    reader.onerror = () => setError('Failed to read image. Please try again.');
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setImagePreview(null);
    fileInputRef.current?.value && (fileInputRef.current.value = '');
  };

  const dataUrlToBlob = (dataUrl) => {
    const parts = dataUrl.split(',');
    const meta = parts[0];
    const base64 = parts[1];
    const mimeMatch = /data:(.*?);base64/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: mime });
  };

  const handleProcess = async () => {
    if (!imagePreview) {
      setError('Capture or upload a document first.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const blob = dataUrlToBlob(imagePreview);
      const formData = new FormData();
      formData.append('file', blob, 'scanned_image.png');
      formData.append('source', 'camera_capture');
      formData.append('timestamp', new Date().toISOString());

      const ocrResponse = await fetch(`${window.API_BASE}/multi-agent-ocr`, {
        method: 'POST',
        body: formData
      });

      if (!ocrResponse.ok) {
        throw new Error(`Upload failed: ${ocrResponse.status} ${ocrResponse.statusText}`);
      }

      let parsedResult = null;
      let textBody = '';
      try {
        textBody = await ocrResponse.text();
        parsedResult = JSON.parse(textBody);
      } catch (parseError) {
        console.warn('Failed to parse OCR response as JSON, storing raw text', parseError);
      }

      const serialized = parsedResult ? JSON.stringify(parsedResult) : textBody;

      sessionStorage.setItem('ocrResultData', serialized);
      localStorage.setItem('ocrResultData', serialized);

      navigate('/documents/details');
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="group/design-root relative flex min-h-screen flex-col justify-between bg-[#111827] text-white">
      <div className="mt-8 flex flex-1 flex-col">
        <header className="flex items-center justify-between p-4">
          <button
            type="button"
            className="flex items-center justify-center rounded-full text-white/50 transition-colors hover:text-white"
            onClick={() => setError('Flash toggle is not available in this build.')}
          >
            <span className="material-symbols-outlined">flash_on</span>
          </button>
          <h2 className="flex-1 text-center text-lg font-bold leading-tight tracking-[-0.015em]">Scan Document</h2>
          <button
            type="button"
            className="flex items-center justify-center rounded-full text-white/50 transition-colors hover:text-white"
            onClick={() => navigate('/dashboard')}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center p-4">
          <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border-4 border-dashed border-white/20">
            {imagePreview ? (
              <img src={imagePreview} alt="Captured document" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-white/80">
                <p>
                  Position document within the frame
                  <br />
                  Then press the capture button
                </p>
              </div>
            )}
          </div>
        </main>

        <div className="flex items-center justify-center gap-6 p-4">
          <button
            type="button"
            className="flex shrink-0 items-center justify-center rounded-full bg-white/10 px-6 py-3 text-base font-medium text-white"
            onClick={handleSelectFile}
          >
            {imagePreview ? 'Retake' : 'Capture Photo'}
          </button>
          <button
            type="button"
            className="flex shrink-0 items-center justify-center rounded-full bg-[var(--primary-color)] px-6 py-3 text-base font-bold text-[#111827] disabled:opacity-60"
            onClick={handleProcess}
            disabled={!imagePreview || isUploading}
          >
            {isUploading ? 'Processing...' : 'Confirm & Upload'}
          </button>
        </div>

        {imagePreview && (
          <div className="flex items-center justify-center p-2">
            <button
              type="button"
              className="text-sm text-white/70 underline"
              onClick={handleRetake}
              disabled={isUploading}
            >
              Retake photo
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {error && (
          <div className="px-4 pb-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default DocumentScan;
