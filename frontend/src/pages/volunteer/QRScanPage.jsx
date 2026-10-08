import { useState } from 'react';
import api from '../../api/client';
import { QrCode, Camera, CheckCircle2, XCircle } from 'lucide-react';
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
      toast.success(data.data.message);
      setCode('');
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Scan failed' });
      toast.error(err.response?.data?.message || 'Invalid QR code');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Scan QR Code</h1>
        <p className="text-surface-500 mt-1">Verify food pickup or delivery with QR code</p>
      </div>

      <div className="glass-card p-8">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
          <QrCode className="w-10 h-10 text-white" />
        </div>

        <p className="text-center text-surface-500 text-sm mb-6">
          Enter the QR code shown at the pickup/delivery point.
          In the mobile app, this would use the camera scanner.
        </p>

        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-surface-700 mb-1.5 block">QR Code Value</label>
            <div className="relative">
              <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                className="input-field pl-10 font-mono" placeholder="Paste or enter QR code..." required />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><QrCode className="w-4 h-4" /> Verify Code</>
            )}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-xl border ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          } animate-slide-up`}>
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? 'Verified!' : 'Failed'}
                </p>
                <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
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
