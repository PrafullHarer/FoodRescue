import { useState, useEffect } from 'react';
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
      <div className="border-b border-[#232328] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">QR Code Verification & Handoff</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Validate food pickup inspection or verify shelter dropoff receipt.
          </p>
        </div>
      </div>

      {/* Code Input Card */}
      <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1c1c20] border border-[#2c2c34] flex items-center justify-center flex-shrink-0">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Enter or Scan Verification Token</h3>
            <p className="text-xs text-neutral-400">
              Enter the alphanumeric code from the donor or volunteer screen.
            </p>
          </div>
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
        <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-6 animate-slide-up">
          {/* Milestone Banner */}
          <div className="flex items-center justify-between border-b border-[#232328] pb-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                isPickup
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {isPickup ? 'Step 1: Food Pickup from Donor' : 'Step 2: Food Dropoff to Shelter'}
              </span>
            </div>
            <span className="font-mono text-xs text-neutral-400 bg-[#18181b] px-2.5 py-1 rounded-lg border border-[#282830]">
              {qrPreview.code}
            </span>
          </div>

          {/* Donation Summary Card */}
          <div className="bg-[#0c0c0e] border border-[#232328] rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="badge badge-neutral uppercase text-[10px] font-bold mb-1">
                  {qrPreview.donation?.category?.replace(/_/g, ' ')}
                </span>
                <h3 className="text-lg font-bold text-white">{qrPreview.donation?.title}</h3>
                {qrPreview.donation?.description && (
                  <p className="text-neutral-400 text-xs mt-0.5">{qrPreview.donation.description}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0 bg-[#141416] p-3 rounded-xl border border-[#232328]">
                <span className="text-xl font-black text-white block">
                  {qrPreview.donation?.quantity} <span className="text-xs font-normal text-neutral-400">{qrPreview.donation?.unit || 'servings'}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-[#1c1c22]">
              <div>
                <span className="text-neutral-500 uppercase text-[10px] font-bold block">Food Donor Provider</span>
                <p className="text-white font-medium">{qrPreview.provider?.business_name}</p>
                <p className="text-neutral-400 text-[11px]">{qrPreview.provider?.address}</p>
              </div>

              <div>
                <span className="text-neutral-500 uppercase text-[10px] font-bold block">Destination Shelter NGO</span>
                <p className="text-white font-medium">{qrPreview.ngo?.organization_name}</p>
                <p className="text-neutral-400 text-[11px]">{qrPreview.ngo?.address}</p>
              </div>
            </div>
          </div>

          {/* IF PICKUP QR: VOLUNTEER QUALITY CHECKLIST */}
          {isPickup && (
            <div className="space-y-4 border-t border-[#232328] pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-white tracking-tight">Volunteer Quality Inspection Checklist</h4>
              </div>
              <p className="text-xs text-neutral-400">
                Please inspect the food items at the donor location before accepting and commencing transit.
              </p>

              <div className="space-y-2.5">
                {/* Checkpoint 1 */}
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#0c0c0e] border border-[#232328] cursor-pointer hover:border-[#383842] transition-colors">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${checklist.freshness ? 'text-emerald-400' : 'text-neutral-600'}`} />
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
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#0c0c0e] border border-[#232328] cursor-pointer hover:border-[#383842] transition-colors">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${checklist.packaging ? 'text-emerald-400' : 'text-neutral-600'}`} />
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
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#0c0c0e] border border-[#232328] cursor-pointer hover:border-[#383842] transition-colors">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${checklist.temperature ? 'text-emerald-400' : 'text-neutral-600'}`} />
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
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#0c0c0e] border border-[#232328] cursor-pointer hover:border-[#383842] transition-colors">
                  <span className="text-xs font-medium text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${checklist.quantity ? 'text-emerald-400' : 'text-neutral-600'}`} />
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
            <div className="space-y-4 border-t border-[#232328] pt-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white tracking-tight">Volunteer Inspection Report</h4>
              </div>

              {completedChecklist?.items ? (
                <div className="p-4 rounded-xl bg-[#0c0c0e] border border-[#232328] space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-[#1c1c22] pb-2">
                    <span>Inspected by: <strong className="text-white">{completedChecklist.inspector_name || qrPreview.volunteer?.name || 'Volunteer'}</strong></span>
                    <span>{completedChecklist.inspected_at ? new Date(completedChecklist.inspected_at).toLocaleTimeString() : ''}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {completedChecklist.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-neutral-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>

                  {completedChecklist.notes && (
                    <p className="text-xs text-neutral-400 italic pt-1">
                      Note: "{completedChecklist.notes}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">Standard safety guidelines verified by courier.</p>
              )}

              <button
                onClick={handleConfirmScan}
                disabled={submitting}
                className="btn btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
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

