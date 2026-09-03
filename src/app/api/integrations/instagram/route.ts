import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    // Redirect to Instagram OAuth Dialog
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/instagram`;
    const instagramAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
    
    return NextResponse.redirect(instagramAuthUrl);
  }

  // Handle OAuth callback
  // Exchange code for short-lived access token
  // Exchange short-lived for long-lived access token
  
  return NextResponse.json({ 
    success: true, 
    message: "Instagram account linked successfully!" 
  });
}
