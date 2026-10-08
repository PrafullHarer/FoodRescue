import { useState } from 'react';
import api from '../../api/client';
import { QrCode, Camera, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QRScanPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post(`/qr-codes/${code.trim()}/scan`);
      setResult({ success: true, ...data.data });
      toast.success(data.data.message || 'QR code verified successfully!');
      setCode('');
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Scan failed' });
      toast.error(err.response?.data?.message || 'Invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <div className="border-b border-[#232328] pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Verify QR Code</h1>
        <p className="text-neutral-400 text-sm mt-1">Verify food pickup or delivery handoff using secure tokens</p>
      </div>

      <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-8 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-[#1c1c20] border border-[#2c2c34] flex items-center justify-center mx-auto mb-6">
          <QrCode className="w-8 h-8 text-white" />
        </div>

        <p className="text-center text-neutral-400 text-xs mb-8 leading-relaxed max-w-sm mx-auto">
          Enter the alphanumeric QR verification code generated for the donation handoff to complete milestone verification.
        </p>

        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 block">
              Verification Code
            </label>
            <div className="relative">
              <Camera className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input pl-10 font-mono tracking-wider text-sm"
                placeholder="e.g. RESCUE-QR-89024"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Verify Token
              </>
            )}
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 p-5 rounded-2xl border ${
              result.success
                ? 'bg-[#151d16] border-[#2b4c2d] text-white'
                : 'bg-[#1e1416] border-[#4c242b] text-white'
            } animate-slide-up`}
          >
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {result.success ? 'Handoff Verified' : 'Verification Failed'}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
