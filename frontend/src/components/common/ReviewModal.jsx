import { useState } from 'react';
import { Star, X, Check, ThumbsUp, Sparkles, MessageSquare } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const PRESET_TAGS = [
  'Fresh Food',
  'Hygienic Packaging',
  'Prompt Handover',
  'Accurate Portions',
  'Polite & Friendly',
  'Great Communication',
  'Well Preserved',
  'Quick Pickup',
];

const RATING_DESCRIPTIONS = {
  1: 'Poor — Unsatisfactory quality or delay',
  2: 'Fair — Acceptable but needs improvement',
  3: 'Good — Standard quality and service',
  4: 'Very Good — Fresh and smooth handover',
  5: 'Exceptional! — Perfect food quality and fast turnaround',
};

export default function ReviewModal({ isOpen, onClose, donation, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['Fresh Food', 'Hygienic Packaging']);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !donation) return null;

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/reviews', {
        donation_id: donation.id,
        claim_id: donation.claim_id || null,
        rating,
        comment,
        tags: selectedTags,
        review_type: 'claim',
      });

      toast.success('Thank you! Review submitted successfully.');
      if (onReviewSubmitted) {
        onReviewSubmitted(res.data?.data);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121214] border border-[#27272e] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl shadow-black/80 animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-[#232328] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shadow-md">
              <Star className="w-5 h-5 fill-black stroke-black" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Review Food Claim</h3>
              <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-xs">{donation.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1c1c20] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rating Selection */}
          <div className="text-center space-y-2">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
              Overall Experience Rating
            </label>
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= activeRating
                        ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-neutral-300 h-5 transition-all">
              {RATING_DESCRIPTIONS[activeRating]}
            </p>
          </div>

          {/* Quick Feedback Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white" /> What went well?
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white text-black border border-white shadow-sm'
                        : 'bg-[#18181c] text-neutral-400 border border-[#27272e] hover:text-white hover:border-neutral-500'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Comment */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-white" /> Detailed Comments & Feedback (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about the freshness of the food, packaging quality, or interaction with the provider/volunteer..."
              className="w-full rounded-2xl bg-[#0c0c0e] border border-[#27272e] p-3.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all resize-none"
            />
          </div>

          {/* Provider / Volunteer Info Preview */}
          <div className="bg-[#0c0c0e] rounded-2xl p-3.5 border border-[#232328] flex items-center justify-between text-xs text-neutral-400">
            <span>Reviewing Provider:</span>
            <span className="font-semibold text-white">{donation.provider_name || 'Food Provider'}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-[#1c1c20] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary text-xs flex items-center gap-2 py-2.5 px-5"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {submitting ? 'Submitting Review...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
