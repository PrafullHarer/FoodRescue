import { useState } from 'react';
import { AlertTriangle, X, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ReportIncidentModal({
  isOpen,
  onClose,
  donationId = null,
  deliveryId = null,
  defaultTitle = '',
  onSuccess
}) {
  const [incidentType, setIncidentType] = useState('food_safety_quality');
  const [title, setTitle] = useState(defaultTitle || '');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        incident_type: incidentType,
        title: title.trim(),
        description: description.trim(),
        severity,
        donation_id: donationId || undefined,
        delivery_id: deliveryId || undefined,
      };

      const res = await api.post('/incidents', payload);
      setResult(res.data.data);
      toast.success(`Incident reported: ${res.data.data.incident_reference}`);
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit incident');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#141416] border border-[#282830] rounded-[28px] max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#232328] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Report Operational Incident</h3>
              <p className="text-xs text-neutral-400">Log an issue for administrative investigation</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#232328]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-5 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">Incident Report Submitted</h4>
              <p className="text-xs text-neutral-400">
                Your incident has been recorded and an administrator will review it.
              </p>
            </div>

            <div className="p-3 bg-[#0c0c0e] rounded-xl border border-[#232328] font-mono text-sm font-bold text-white tracking-widest">
              Reference: {result.incident_reference}
            </div>

            <button onClick={handleClose} className="btn btn-primary w-full text-xs py-2.5">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Incident Category
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="input text-xs w-full bg-[#18181b]"
                required
              >
                <option value="food_safety_quality">Food Safety / Packaging Concern</option>
                <option value="late_delivery">Late Delivery / Courier Delay</option>
                <option value="missed_pickup">Missed Pickup by Volunteer</option>
                <option value="failed_qr_scan">QR Verification Issue</option>
                <option value="volunteer_no_show">Volunteer No-Show</option>
                <option value="provider_complaint">Food Provider Issue</option>
                <option value="ngo_complaint">NGO Shelter Issue</option>
                <option value="other">Other Operational Incident</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Short Summary Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Broken seal on soup container"
                className="input text-xs w-full bg-[#18181b]"
                required
                minLength={5}
                maxLength={255}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Detailed Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred, temperature or packaging condition, communications, etc."
                className="input text-xs w-full bg-[#18181b]"
                required
                minLength={10}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Assessed Urgency Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['low', 'medium', 'high', 'critical'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`py-1.5 px-2 rounded-xl font-bold uppercase text-[10px] border transition-all ${
                      severity === s
                        ? s === 'critical'
                          ? 'bg-rose-500 text-white border-rose-500'
                          : s === 'high'
                          ? 'bg-amber-500 text-black border-amber-500'
                          : 'bg-white text-black border-white'
                        : 'bg-[#18181b] text-neutral-400 border-[#282830]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#232328]">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="btn btn-primary text-xs py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {submitting ? 'Submitting...' : 'Submit Incident Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
