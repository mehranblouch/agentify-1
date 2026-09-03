import { NextResponse } from "next/server";
import { getStudents, saveStudent, deleteStudent } from "@/lib/services/sqlite-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
    
    const students = getStudents(userId);
    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, name, father_name, phone } = body;
    if (!user_id || !name || !phone) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const saved = saveStudent({ user_id, name, father_name, phone });
    return NextResponse.json({ success: true, data: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const id = searchParams.get("id");
    if (!userId || !id) return NextResponse.json({ success: false, error: "Missing userId or id" }, { status: 400 });
    
    deleteStudent(id, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
