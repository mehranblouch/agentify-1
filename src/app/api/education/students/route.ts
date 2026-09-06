import { NextResponse } from "next/server";
import { getStudents, saveStudent, deleteStudent } from "@/lib/services/sqlite-store";
import { requireSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId) return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const students = getStudents(userId);
    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId) return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const body = await req.json();
    const { name, father_name, phone } = body;
    if (!name || !phone) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const saved = saveStudent({ user_id: userId, name, father_name: father_name || "", phone });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const guarded = requireSession(req);
    if ("error" in guarded) return guarded.error;
    const userId = guarded.session.userId;
    if (!userId) return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

    deleteStudent(id, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}