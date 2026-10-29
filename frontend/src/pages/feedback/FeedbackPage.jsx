import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';
import api from '../../api/client';
import {
  Star, ArrowLeft, Send, CheckCircle2, AlertCircle,
  MessageSquare, ShieldCheck, RefreshCw
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

const FEEDBACK_TYPES = [
  { value: 'General Feedback', label: 'General Feedback' },
  { value: 'Suggestion', label: 'Feature Suggestion' },
  { value: 'Bug Report', label: 'Bug or Glitch Report' },
  { value: 'User Experience', label: 'User Experience & Design' },
  { value: 'Other', label: 'Other Inquiries' },
];

const RATING_LABELS = {
  1: '1 Star - Needs major improvement',
  2: '2 Stars - Fair, room for improvement',
  3: '3 Stars - Good, meets expectations',
  4: '4 Stars - Very good experience',
  5: '5 Stars - Excellent, love it!',
};

export default function FeedbackPage() {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    feedback_type: 'General Feedback',
    rating: 5,
    subject: '',
    message: '',
    is_anonymous: false,
    website: '', // Honeypot spam field
  });

  const [hoveredRating, setHoveredRating] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateForm = () => {
    const errs = {};
    if (!formData.subject.trim()) {
      errs.subject = 'Please provide a subject.';
    } else if (formData.subject.trim().length > 150) {
      errs.subject = 'Subject cannot exceed 150 characters.';
    }

    if (!formData.message.trim()) {
      errs.message = 'Please provide your message.';
    } else if (formData.message.trim().length < 10) {
      errs.message = 'Please provide at least 10 characters so we can understand your feedback.';
    } else if (formData.message.trim().length > 3000) {
      errs.message = 'Message cannot exceed 3,000 characters.';
    }

    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address.';
      }
    }

    return errs;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.is_anonymous ? null : (formData.name.trim() || null),
        email: formData.email.trim() || null,
        feedback_type: formData.feedback_type,
        rating: formData.rating || null,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        is_anonymous: Boolean(formData.is_anonymous),
        website: formData.website, // Honeypot
      };

      await api.post('/feedback', payload);
      setIsSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to submit feedback right now. Please try again later.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: user?.full_name || '',
      email: user?.email || '',
      feedback_type: 'General Feedback',
      rating: 5,
      subject: '',
      message: '',
      is_anonymous: false,
      website: '',
    });
    setErrors({});
    setServerError('');
    setIsSuccess(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      {/* ─── Header Navigation ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-xl border-b border-[#E5E7EB] dark:border-[#232328]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-[#232328] transition-all"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Logo to="/" size="sm" showText={true} />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="icon" />
            {user ? (
              <Link
                to="/dashboard"
                className="btn btn-secondary text-xs sm:text-sm py-2 px-3.5"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white px-3 py-1.5"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 animate-fade-in">
        {isSuccess ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                Thank You for Your Feedback!
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto">
                Thank you for helping us improve FoodRescue! Your feedback has been submitted successfully and will be reviewed by our platform administrators.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] max-w-md mx-auto text-left text-xs space-y-1 text-neutral-600 dark:text-neutral-400">
              <div className="flex justify-between">
                <span className="font-medium text-neutral-500">Category:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{formData.feedback_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-500">Subject:</span>
                <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[200px]">{formData.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-500">Submission mode:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formData.is_anonymous ? 'Anonymous' : (formData.name || 'Public Visitor')}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary w-full sm:w-auto text-sm px-6 py-3 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Submit Another Feedback</span>
              </button>
              <Link
                to="/"
                className="btn btn-primary w-full sm:w-auto text-sm px-6 py-3"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>Community Voice</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                We'd Love Your Feedback
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
                Help us improve FoodRescue. Share your suggestions, report an issue, or tell us about your experience. Anyone can submit feedback—no account required.
              </p>
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Submission failed</p>
                  <p className="text-xs mt-0.5">{serverError}</p>
                </div>
              </div>
            )}

            {/* Feedback Form Card */}
            <form
              onSubmit={handleSubmit}
              noValidate
              className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] shadow-sm space-y-6"
            >
              {/* Honeypot anti-spam trap */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* 1. Rating control */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                  Overall Rating <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (hoveredRating || formData.rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={formData.rating === star}
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => handleChange('rating', star)}
                          className="p-1 rounded-lg hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                              isFilled
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-300 dark:text-neutral-700'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 ml-2">
                    {RATING_LABELS[hoveredRating || formData.rating] || ''}
                  </span>
                </div>
              </div>

              {/* 2. Feedback Category Options */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                  Feedback Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FEEDBACK_TYPES.map((t) => {
                    const isSelected = formData.feedback_type === t.value;
                    const typeTheme = {
                      'General Feedback': {
                        border: 'border-emerald-500/40 dark:border-emerald-500/50',
                        bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30',
                        dot: 'bg-emerald-500',
                      },
                      'Suggestion': {
                        border: 'border-sky-500/40 dark:border-sky-500/50',
                        bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold ring-1 ring-sky-500/30',
                        dot: 'bg-sky-500',
                      },
                      'Bug Report': {
                        border: 'border-rose-500/40 dark:border-rose-500/50',
                        bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold ring-1 ring-rose-500/30',
                        dot: 'bg-rose-500',
                      },
                      'User Experience': {
                        border: 'border-purple-500/40 dark:border-purple-500/50',
                        bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold ring-1 ring-purple-500/30',
                        dot: 'bg-purple-500',
                      },
                      'Other': {
                        border: 'border-amber-500/40 dark:border-amber-500/50',
                        bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold ring-1 ring-amber-500/30',
                        dot: 'bg-amber-500',
                      },
                    }[t.value] || {
                      border: 'border-neutral-400',
                      bg: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white',
                      dot: 'bg-neutral-400',
                    };

                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleChange('feedback_type', t.value)}
                        className={`px-3 py-2.5 rounded-xl text-xs flex items-center gap-2 border transition-all text-left cursor-pointer ${
                          isSelected
                            ? `${typeTheme.border} ${typeTheme.bg} shadow-xs`
                            : 'bg-neutral-50 dark:bg-[#18181b] border-neutral-200 dark:border-[#232328] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? typeTheme.dot : 'bg-neutral-400 dark:bg-neutral-600'} shrink-0`} />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Subject input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="subject"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400"
                  >
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {formData.subject.length}/150
                  </span>
                </div>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  maxLength={150}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="e.g. Quick pickup feature feedback, shelter coordination suggestion..."
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#18181b] border text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 focus:outline-none transition-colors ${
                    errors.subject
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white'
                  }`}
                />
                {errors.subject && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.subject}</span>
                  </p>
                )}
              </div>

              {/* 4. Message textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="message"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400"
                  >
                    Message Details <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] ${formData.message.length > 2900 ? 'text-amber-500 font-bold' : 'text-neutral-400'}`}>
                    {formData.message.length}/3,000 chars
                  </span>
                </div>
                <textarea
                  id="message"
                  rows={5}
                  value={formData.message}
                  maxLength={3000}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Tell us what worked well, what felt confusing, or what feature would make surplus food rescue smoother for you..."
                  className={`w-full px-3.5 py-3 rounded-xl bg-neutral-50 dark:bg-[#18181b] border text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 focus:outline-none transition-colors resize-y min-h-[120px] ${
                    errors.message
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white'
                  }`}
                />
                {errors.message && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{errors.message}</span>
                  </p>
                )}
              </div>

              {/* 5. Name & Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-200 dark:border-[#232328]">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
                  >
                    Your Name <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    disabled={formData.is_anonymous}
                    value={formData.is_anonymous ? '' : formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={formData.is_anonymous ? 'Submitting anonymously' : 'e.g. Elena Vance'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed focus:border-neutral-900 dark:focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
                  >
                    Email Address <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. elena@example.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#18181b] border text-neutral-900 dark:text-white text-sm placeholder:text-neutral-400 focus:outline-none transition-colors ${
                      errors.email
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white'
                    }`}
                  />
                  {errors.email ? (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.email}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Provide if you'd like our team to reply to your inquiry.
                    </p>
                  )}
                </div>
              </div>

              {/* 6. Anonymous toggle */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] flex items-start gap-3">
                <input
                  type="checkbox"
                  id="is_anonymous"
                  checked={formData.is_anonymous}
                  onChange={(e) => handleChange('is_anonymous', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-neutral-900 dark:text-white border-neutral-300 dark:border-[#232328] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="is_anonymous" className="cursor-pointer">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-white">
                    Submit anonymously
                  </span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    When checked, your name and user profile will not be recorded or linked to this feedback in our database.
                  </span>
                </label>
              </div>

              {/* 7. Privacy notice */}
              <div className="flex items-start gap-2.5 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p>
                  <strong className="text-neutral-700 dark:text-neutral-300">Privacy Notice:</strong> Submissions are stored securely in PostgreSQL and accessible strictly to verified FoodRescue platform administrators for service improvements. Contact information is never sold or shared with third parties.
                </p>
              </div>

              {/* 8. Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary w-full sm:w-auto text-sm px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Feedback...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200 dark:border-[#232328] bg-white dark:bg-[#0c0c0e] py-6 text-xs text-center text-neutral-500 dark:text-neutral-400">
        <p>© {CURRENT_YEAR} FoodRescue Platform. Thank you for contributing to community sustainability.</p>
      </footer>
    </div>
  );
}
