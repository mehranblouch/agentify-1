import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getUserById, addReview, getApprovedReviews, userHasReviewed } from "@/lib/services/sqlite-store";

export async function GET() {
  try {
    const reviews = getApprovedReviews(50);
    return NextResponse.json({ success: true, reviews });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guarded = requireSession(req);
  if ("error" in guarded) {
    return NextResponse.json({ success: false, error: "Please log in to leave a review." }, { status: 401 });
  }
  const { userId } = guarded.session;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Please log in to leave a review." }, { status: 401 });
  }
  try {
    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: "Account not found. Please log in again." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rating = Math.round(Number(body.rating));
    const content = String(body.content || "").trim();
    const businessName = String(body.businessName || "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Please select a rating from 1 to 5 stars." }, { status: 400 });
    }
    if (content.length < 10) {
      return NextResponse.json({ success: false, error: "Please write a review of at least 10 characters." }, { status: 400 });
    }
    if (content.length > 1000) {
      return NextResponse.json({ success: false, error: "Review is too long (max 1000 characters)." }, { status: 400 });
    }
    if (userHasReviewed(user.id)) {
      return NextResponse.json({ success: false, error: "You have already left a review." }, { status: 409 });
    }

    const review = addReview(user, rating, content, businessName);
    return NextResponse.json({ success: true, review });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}