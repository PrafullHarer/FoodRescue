import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  QrCode, Camera, CheckCircle2, XCircle, ShieldCheck,
  Package, MapPin, User, Truck, Clock, Sparkles, Check,
  AlertTriangle, ArrowLeft, Eye, MessageSquare, ThumbsUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function QRScanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [code, setCode] = useState(searchParams.get('code') || '');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [webCamActive, setWebCamActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Mobile App Native Hardware Camera Bridge
  useEffect(() => {
    window.handleNativeQRScanned = (scannedCode) => {
      const clean = (scannedCode || '').trim().toUpperCase();
      if (!clean) return;
      setCode(clean);
      toast.success('QR Code verified by camera!');
      handlePreview(clean);
    };

    return () => {
      delete window.handleNativeQRScanned;
    };
  }, []);

  const handleLaunchCamera = () => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OPEN_CAMERA_SCANNER' }));
      return;
    }
    // Web browser camera fallback
    setWebCamActive((prev) => !prev);
  };

  useEffect(() => {
    if (!webCamActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let interval = null;
    let cancelled = false;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }

          if ('BarcodeDetector' in window) {
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            interval = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    let raw = barcodes[0].rawValue || '';
                    if (raw.includes('code=')) {
                      raw = raw.split('code=')[1].split('&')[0];
                    }
                    const detected = decodeURIComponent(raw).trim().toUpperCase();
                    if (detected) {
                      setCode(detected);
                      setWebCamActive(false);
                      toast.success('QR Code detected!');
                      handlePreview(detected);
                    }
                  }
                } catch {
                  // scanning...
                }
              }
            }, 300);
          }
        })
        .catch((err) => {
          console.warn('Webcam error:', err);
          toast.error('Could not access camera. Enter code manually.');
          setWebCamActive(false);
        });
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [webCamActive]);

  // Quality checklist state for pickup inspection
  const [checklist, setChecklist] = useState({
    freshness: true,
    packaging: true,
    temperature: true,
    quantity: true,
    notes: '',
  });

  const handlePreview = async (codeToInspect) => {
    const c = (codeToInspect || code).trim().toUpperCase();
    if (!c) {
      toast.error('Please enter a verification code');
      return;
    }

    try {
      setPreviewLoading(true);
      setScanResult(null);
      const { data } = await api.get(`/qr-codes/preview/${c}`);
      setQrPreview(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired QR code');
      setQrPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (initialCode) {
      setCode(initialCode);
      handlePreview(initialCode);
    }
  }, [searchParams]);

  const handleConfirmScan = async () => {
    if (!qrPreview) return;
    const cleanCode = qrPreview.code;

    try {
      setSubmitting(true);

      const payload = {};
      if (qrPreview.type === 'pickup') {
        payload.qualityChecklist = {
          passed: checklist.freshness && checklist.packaging && checklist.temperature && checklist.quantity,
          inspected_at: new Date().toISOString(),
          inspector_name: user?.full_name || 'Volunteer Inspector',
          items: [
            { label: 'Freshness & Visual Quality', status: checklist.freshness ? 'pass' : 'fail' },
            { label: 'Packaging & Seal Integrity', status: checklist.packaging ? 'pass' : 'fail' },
            { label: 'Safe Storage & Temperature', status: checklist.temperature ? 'pass' : 'fail' },
            { label: 'Portion & Quantity Match', status: checklist.quantity ? 'pass' : 'fail' },
          ],
          notes: checklist.notes,
        };
      }

      const { data } = await api.post(`/qr-codes/${cleanCode}/scan`, payload);
      setScanResult({ success: true, ...data.data });
      toast.success(data.data?.message || 'Handoff verified successfully!');
      setQrPreview(null);
      setCode('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
      setScanResult({ success: false, message: err.response?.data?.message || 'Verification failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const isPickup = qrPreview?.type === 'pickup';
  const isDelivery = qrPreview?.type === 'delivery';
  const completedChecklist = qrPreview?.delivery?.quality_checklist
    ? (typeof qrPreview.delivery.quality_checklist === 'string'
        ? JSON.parse(qrPreview.delivery.quality_checklist)
        : qrPreview.delivery.quality_checklist)
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-[#232328] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">QR Code Verification & Handoff</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Validate food pickup inspection or verify shelter dropoff receipt.
          </p>
        </div>
      </div>

      {/* Code Input Card */}
      <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#2c2c34] flex items-center justify-center flex-shrink-0">
            <QrCode className="w-6 h-6 text-neutral-900 dark:text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Enter or Scan Verification Token</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Enter the alphanumeric code from the donor or volunteer screen.
            </p>
          </div>
        </div>

        {/* Hardware Camera Scanner Action */}
        <button
          type="button"
          onClick={handleLaunchCamera}
          className="w-full py-4 px-5 rounded-2xl bg-[#162215] dark:bg-[#121c13] border border-lime-500/40 hover:border-lime-500 text-white font-bold flex items-center justify-between shadow-lg shadow-lime-950/20 active:scale-[0.99] transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-lime-500/20 border border-lime-500/30 flex items-center justify-center text-lime-400 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-lime-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Scan with Camera</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 border border-lime-500/30">
                  Live Scanner
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-normal mt-0.5">
                Point camera at donor or shelter QR code to scan
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400 group-hover:text-lime-400 group-hover:translate-x-0.5 transition-all">
            <Sparkles className="w-4 h-4 text-lime-400" />
          </div>
        </button>

        {/* Web Camera Stream Fallback for standard browsers */}
        {webCamActive && (
          <div className="p-4 bg-neutral-900 border border-lime-500/30 rounded-2xl space-y-3 animate-fade-in text-center">
            <div className="relative aspect-video max-w-sm mx-auto overflow-hidden rounded-xl border border-neutral-700 bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-lime-400/80 rounded-lg pointer-events-none" />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-400 px-2">
              <span>Align QR code in camera view</span>
              <button
                type="button"
                onClick={() => setWebCamActive(false)}
                className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
              >
                Close Camera
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-neutral-200 dark:bg-[#232328]" />
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">or enter code manually</span>
          <div className="flex-1 h-[1px] bg-neutral-200 dark:bg-[#232328]" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePreview();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
              Verification Code (Pickup or Dropoff)
            </label>
            <div className="relative">
              <Camera className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input pl-10 font-mono tracking-wider text-sm uppercase"
                placeholder="e.g. RESCUE-PK-A1B2C3 or RESCUE-DL-X1Y2Z3"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={previewLoading || !code.trim()}
            className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
          >
            {previewLoading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Inspect & Verify Code
              </>
            )}
          </button>
        </form>
      </div>

      {/* QR Preview & Inspection Area */}
      {qrPreview && (
        <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-6 animate-slide-up">
          {/* Milestone Banner */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-[#232328] pb-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isPickup
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                {isPickup ? 'Step 1: Food Pickup from Donor' : 'Step 2: Food Dropoff to Shelter'}
              </span>
            </div>
            <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-[#18181b] px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-[#282830]">
              {qrPreview.code}
            </span>
          </div>

          {/* Donation Summary Card */}
          <div className="bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="badge badge-neutral uppercase text-[10px] font-bold mb-1">
                  {qrPreview.donation?.category?.replace(/_/g, ' ')}
                </span>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{qrPreview.donation?.title}</h3>
                {qrPreview.donation?.description && (
                  <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">{qrPreview.donation.description}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0 bg-white dark:bg-[#141416] p-3 rounded-xl border border-neutral-200 dark:border-[#232328] shadow-xs">
                <span className="text-xl font-black text-neutral-900 dark:text-white block">
                  {qrPreview.donation?.quantity} <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">{qrPreview.donation?.unit || 'servings'}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-neutral-200 dark:border-[#1c1c22]">
              <div>
                <span className="text-neutral-500 uppercase text-[10px] font-bold block">Food Donor Provider</span>
                <p className="text-neutral-900 dark:text-white font-medium">{qrPreview.provider?.business_name}</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">{qrPreview.provider?.address}</p>
              </div>

              <div>
                <span className="text-neutral-500 uppercase text-[10px] font-bold block">Destination Shelter NGO</span>
                <p className="text-neutral-900 dark:text-white font-medium">{qrPreview.ngo?.organization_name}</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-[11px]">{qrPreview.ngo?.address}</p>
              </div>
            </div>
          </div>

          {/* IF PICKUP QR: VOLUNTEER QUALITY CHECKLIST */}
          {isPickup && (
            <div className="space-y-4 border-t border-neutral-200 dark:border-[#232328] pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Volunteer Quality Inspection Checklist</h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Please inspect the food items at the donor location before accepting and commencing transit.
              </p>

              <div className="space-y-2.5">
                {/* Checkpoint 1 */}
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] cursor-pointer hover:border-neutral-300 dark:hover:border-[#383842] transition-colors">
                  <span className="text-xs font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${checklist.freshness ? 'text-emerald-500' : 'text-neutral-400 dark:text-neutral-600'}`} />
                    1. Freshness & Visual Appearance
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist.freshness}
                    onChange={(e) => setChecklist({ ...checklist, freshness: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                {/* Checkpoint 2 */}
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] cursor-pointer hover:border-neutral-300 dark:hover:border-[#383842] transition-colors">
                  <span className="text-xs font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${checklist.packaging ? 'text-emerald-500' : 'text-neutral-400 dark:text-neutral-600'}`} />
                    2. Packaging & Container Seal Integrity
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist.packaging}
                    onChange={(e) => setChecklist({ ...checklist, packaging: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                {/* Checkpoint 3 */}
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] cursor-pointer hover:border-neutral-300 dark:hover:border-[#383842] transition-colors">
                  <span className="text-xs font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${checklist.temperature ? 'text-emerald-500' : 'text-neutral-400 dark:text-neutral-600'}`} />
                    3. Safe Storage, Hygiene & Temperature
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist.temperature}
                    onChange={(e) => setChecklist({ ...checklist, temperature: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                {/* Checkpoint 4 */}
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] cursor-pointer hover:border-neutral-300 dark:hover:border-[#383842] transition-colors">
                  <span className="text-xs font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${checklist.quantity ? 'text-emerald-500' : 'text-neutral-400 dark:text-neutral-600'}`} />
                    4. Portion & Quantity Verification
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist.quantity}
                    onChange={(e) => setChecklist({ ...checklist, quantity: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Notes input */}
              <div>
                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1.5">
                  Inspection Notes (Optional)
                </label>
                <input
                  type="text"
                  value={checklist.notes}
                  onChange={(e) => setChecklist({ ...checklist, notes: e.target.value })}
                  placeholder="e.g. Hot container securely strapped, sealed properly"
                  className="input text-xs"
                />
              </div>

              <button
                onClick={handleConfirmScan}
                disabled={submitting}
                className="btn btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Confirm Pickup & Start Delivery
                  </>
                )}
              </button>
            </div>
          )}

          {/* IF DROPOFF QR: NGO RECEIPT & VOLUNTEER QUALITY INSPECTION REVIEW */}
          {isDelivery && (
            <div className="space-y-4 border-t border-neutral-200 dark:border-[#232328] pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Volunteer Inspection Report</h4>
              </div>

              {completedChecklist?.items ? (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-[#1c1c22] pb-2">
                    <span>Inspected by: <strong className="text-neutral-900 dark:text-white">{completedChecklist.inspector_name || qrPreview.volunteer?.name || 'Volunteer'}</strong></span>
                    <span>{completedChecklist.inspected_at ? new Date(completedChecklist.inspected_at).toLocaleTimeString() : ''}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {completedChecklist.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {completedChecklist.notes && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 italic pt-1">
                      Note: "{completedChecklist.notes}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Standard safety guidelines verified by courier.</p>
              )}

              <button
                onClick={handleConfirmScan}
                disabled={submitting}
                className="btn btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Confirm Food Received & Complete Rescue
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result Card */}
      {scanResult && (
        <div
          className={`p-6 rounded-[24px] border ${
            scanResult.success
              ? 'bg-[#151d16] border-[#2b4c2d] text-white'
              : 'bg-[#1e1416] border-[#4c242b] text-white'
          } animate-slide-up space-y-4`}
        >
          <div className="flex items-center gap-3">
            {scanResult.success ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-rose-400 flex-shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-base">
                {scanResult.success ? 'Handoff Successfully Verified!' : 'Verification Failed'}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {scanResult.message}
              </p>
            </div>
          </div>

          {scanResult.success && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={`/donations/${scanResult.donation_id || ''}`}
                className="btn btn-primary text-xs"
              >
                View Donation Details
              </Link>
              <Link
                to="/deliveries"
                className="btn btn-secondary text-xs"
              >
                Go to Delivery Missions
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

