import { useState } from 'react';
import { Package, Truck, UserCheck, MapPin, Clock, ArrowRight, ShieldCheck, X, Sparkles } from 'lucide-react';

export default function ClaimDonationModal({
  isOpen,
  onClose,
  donation,
  onConfirmClaim,
  isClaiming = false,
}) {
  const [pickupType, setPickupType] = useState('self_pickup'); // 'self_pickup' | 'volunteer'

  if (!isOpen || !donation) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmClaim(donation.id, pickupType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#141416] border border-[#282830] rounded-[28px] max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#232328] pb-4">
          <div>
            <span className="badge badge-primary text-[10px] font-bold uppercase mb-1">
              Confirm Shelter Claim
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">How will you collect this food?</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Choose whether your NGO will pick it up directly or request community volunteers.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white bg-[#18181b] border border-[#282830] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Donation Brief */}
        <div className="p-4 bg-[#0c0c0e] rounded-2xl border border-[#232328] space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm truncate">{donation.title}</h4>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              {donation.quantity} {donation.unit || 'portions'}
            </span>
          </div>
          <div className="text-xs text-neutral-400 space-y-1">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
              <span className="truncate">{donation.pickup_address}</span>
            </div>
            {donation.provider_name && (
              <p className="text-[11px] text-neutral-500">Provided by <strong className="text-neutral-300">{donation.provider_name}</strong></p>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Option 1: Self Pickup */}
          <div
            onClick={() => setPickupType('self_pickup')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              pickupType === 'self_pickup'
                ? 'bg-[#181a20] border-white shadow-lg shadow-white/5'
                : 'bg-[#121214] border-[#24242c] hover:border-neutral-600'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                pickupType === 'self_pickup' ? 'bg-white text-black font-bold' : 'bg-[#1a1a1f] text-neutral-400'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    Self Pickup (Our NGO Team)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Direct
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Our NGO staff or driver will pick up the food directly from the food provider. No volunteers involved.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Direct donor QR verification at pickup
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Community Volunteers */}
          <div
            onClick={() => setPickupType('volunteer')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              pickupType === 'volunteer'
                ? 'bg-[#181a20] border-white shadow-lg shadow-white/5'
                : 'bg-[#121214] border-[#24242c] hover:border-neutral-600'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                pickupType === 'volunteer' ? 'bg-white text-black font-bold' : 'bg-[#1a1a1f] text-neutral-400'
              }`}>
                <Truck className="w-5 h-5" />
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    Request Volunteer Delivery
                  </span>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Community
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Publish this pickup mission to local volunteers. A volunteer will inspect quality and deliver food to your shelter.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Volunteer receives route and handles transit
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn btn-secondary text-xs py-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isClaiming}
            className="flex-1 btn btn-primary text-xs py-3 flex items-center justify-center gap-2"
          >
            {isClaiming ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <span>Confirm & Claim</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
