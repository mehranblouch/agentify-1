"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Star, Loader2 } from "lucide-react";

type Review = {
  id: string;
  name: string;
  email: string;
  business_type: "clinic" | "education" | null;
  rating: number;
  content: string;
  created_at: string;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-primary" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= value ? "fill-primary" : "text-text-secondary/40"}`} />
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      if (data.success) setReviews(data.reviews || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const average = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return toast.error("Please select a star rating.");
    if (content.trim().length < 10) return toast.error("Please write a review of at least 10 characters.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, content: content.trim(), businessName: name.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) {
          toast.error("Please log in to leave a review.");
        } else {
          toast.error(data.error || "Failed to submit review.");
        }
        return;
      }
      toast.success("Review submitted. Thank you!");
      setRating(0);
      setContent("");
      setName("");
      await loadReviews();
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="py-20">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Reviews from real businesses
        </h2>
        <p className="text-text-secondary">
          {average ? (
            <>
              Rated <span className="text-primary font-black">{average} / 5</span> by{" "}
              {reviews.length} {reviews.length === 1 ? "business" : "businesses"}
            </>
          ) : (
            "Verified feedback from Agentify users."
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Stars value={r.rating} />
                <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                  {r.business_type === "clinic" ? "Clinic" : r.business_type === "education" ? "School" : ""}
                </span>
              </div>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">"{r.content}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-border rounded-full flex items-center justify-center font-bold text-text-secondary">
                  {(r.name || r.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{r.name}</h4>
                  <p className="text-xs text-primary truncate">{r.email}</p>
                </div>
                <span className="ml-auto shrink-0 text-[10px] text-text-secondary">
                  {formatDate(r.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-text-secondary">
          No reviews yet. Be the first to leave one below!
        </p>
      )}

      {/* Review form */}
      <div className="max-w-xl mx-auto mt-16 bg-card border border-border rounded-2xl p-6 sm:p-8">
        <h3 className="text-lg font-bold mb-1">Leave a review</h3>
        <p className="text-xs text-text-secondary mb-6">
          Must be logged in. Your review is shown alongside your business Gmail.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">
              Your Rating
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHoverRating(i)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                  aria-label={`${i} star${i > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      i <= (hoverRating || rating) ? "fill-primary text-primary" : "text-text-secondary/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">
              Business Name <span className="normal-case font-medium">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayesha Clinic"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 block">
              Your Review
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="How has Agentify helped your clinic or school?"
              rows={4}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-white text-black rounded-xl font-black text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Submitting..." : "Post Review"}
          </button>

          <p className="text-center text-xs text-text-secondary">
            <Link href="/login" className="text-primary font-bold hover:underline">
              Log in
            </Link>{" "}
            to leave a review.
          </p>
        </form>
      </div>
    </section>
  );
}