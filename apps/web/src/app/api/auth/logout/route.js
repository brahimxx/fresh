import { success } from '@/lib/response';
import { cookies } from 'next/headers';

// POST /api/auth/logout - Logout user
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  return success({ message: 'Logged out successfully' });
}
