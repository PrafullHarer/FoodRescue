import { useState } from 'react';
import api from '../../api/client';
import {
  X, AlertCircle, CheckCircle2, Loader2, Send, ShieldAlert,
  Calendar, FileText, Link as LinkIcon, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const COMPLAINT_CATEGORIES = [
  { value: 'food_quality_safety', label: 'Food Quality or Safety Concern' },
  { value: 'provider_misconduct', label: 'Food Provider Misconduct' },
  { value: 'ngo_misconduct', label: 'NGO / Shelter Misconduct' },
  { value: 'volunteer_misconduct', label: 'Volunteer / Courier Misconduct' },
  { value: 'missed_pickup', label: 'Missed Pickup by Volunteer/NGO' },
  { value: 'late_delivery', label: 'Late Delivery beyond Window' },
  { value: 'damaged_packaging', label: 'Damaged or Improperly Packaged Food' },
  { value: 'incorrect_quantity', label: 'Incorrect Food Quantity / Weight' },
  { value: 'cancellation_dispute', label: 'Donation Cancellation Dispute' },
  { value: 'qr_verification', label: 'QR Verification or Scan Problem' },
  { value: 'communication_problem', label: 'Communication Problem' },
  { value: 'other', label: 'Other Operational Issue' },
];

export default function RaiseComplaintModal({
  isOpen,
  onClose,
  prefillDonationId = null,
  prefillDeliveryId = null,
  onSuccess,
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('food_quality_safety');
  const [description, setDescription] = useState('');
  const [donationId, setDonationId] = useState(prefillDonationId || '');
  const [deliveryId, setDeliveryId] = useState(prefillDeliveryId || '');
  const [incidentDate, setIncidentDate] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedReference, setSubmittedReference] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return toast.error('Complaint title is required');
    if (!description.trim() || description.trim().length < 10) {
      return toast.error('Detailed description must be at least 10 characters');
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        description: description.trim(),
        donation_id: donationId.trim() || undefined,
        delivery_id: deliveryId.trim() || undefined,
        incident_date: incidentDate || undefined,
        supporting_evidence_url: evidenceUrl.trim() || undefined,
      };

      const res = await api.post('/complaints', payload);
      const created = res.data?.data;
      setSubmittedReference(created?.complaint_reference || 'Submitted');
      toast.success('Complaint submitted successfully');
      if (onSuccess) onSuccess(created);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setSubmittedReference(null);
    setTitle('');
    setDescription('');
    setIncidentDate('');
    setEvidenceUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121214] border border-[#232328] rounded-[24px] max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232328]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Raise a Complaint</h3>
              <p className="text-xs text-neutral-400">Official dispute & quality inquiry ticket</p>
            </div>
          </div>
          <button
            onClick={handleDone}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1f1f23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submittedReference ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Complaint Registered</h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Your complaint has been assigned a reference code and queued for administrator investigation.
              </p>
            </div>
            <div className="p-3 bg-[#0c0c0e] rounded-xl border border-[#232328] inline-block font-mono text-sm font-bold text-emerald-400">
              {submittedReference}
            </div>
            <p className="text-[11px] text-neutral-500">
              You will receive real-time notifications when an administrator reviews or responds to this ticket.
            </p>
            <button
              onClick={handleDone}
              className="btn btn-primary w-full py-2.5 text-sm font-bold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Complaint Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Soup containers leaked during transit"
                maxLength={200}
                required
                className="input text-xs w-full bg-[#18181b] border-[#27272e] focus:border-white text-white"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
              >
                {COMPLAINT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                  Detailed Description *
                </label>
                <span className="text-[10px] text-neutral-500">{description.length}/3000</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what occurred, who was present, batch numbers, or any relevant details..."
                maxLength={3000}
                required
                className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white leading-relaxed resize-none"
              />
            </div>

            {/* Transaction references */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Donation ID (Optional)
                </label>
                <input
                  type="text"
                  value={donationId}
                  onChange={(e) => setDonationId(e.target.value)}
                  placeholder="UUID from donation details"
                  disabled={!!prefillDonationId}
                  className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Delivery Mission ID (Optional)
                </label>
                <input
                  type="text"
                  value={deliveryId}
                  onChange={(e) => setDeliveryId(e.target.value)}
                  placeholder="UUID from delivery details"
                  disabled={!!prefillDeliveryId}
                  className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white disabled:opacity-50"
                />
              </div>
            </div>

            {/* Date & Supporting evidence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Incident Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Evidence URL / Photo (Optional)
                </label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
                />
              </div>
            </div>

            {/* Note on identity */}
            <div className="p-3 bg-[#0c0c0e] rounded-xl border border-[#232328] text-[11px] text-neutral-400 leading-normal flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
              <span>
                Your identity and verified role are authenticated securely. Only administrators and authorized participants can view your submission.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232328]">
              <button
                type="button"
                onClick={handleDone}
                disabled={submitting}
                className="btn btn-secondary text-xs py-2 px-4 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Submit Complaint
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
