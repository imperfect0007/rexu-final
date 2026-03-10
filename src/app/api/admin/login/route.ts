import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../../../../../backend/supabaseAdminClient';
import { signAdminToken } from '../../../../../backend/adminAuth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json().catch(() => ({} as any));

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('id, email, password_hash, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    const adminToken = signAdminToken(admin.id);

    const response = NextResponse.json({ success: true });

    response.cookies.set('admin_auth', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
