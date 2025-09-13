import { NextRequest, NextResponse } from 'next/server';

// Mock database - Replace with actual database connection
let users = [
  {
    user_id: 1,
    username: 'admin',
    email: 'admin@tejit.com',
    password: 'password',
    role_id: 1,
    role_name: 'Super Admin',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: 2,
    username: 'manager',
    email: 'manager@tejit.com',
    password: 'password',
    role_id: 2,
    role_name: 'Client Manager',
    status: 'active',
    created_at: '2024-01-15T09:30:00Z'
  },
  {
    user_id: 3,
    username: 'auditor',
    email: 'auditor@tejit.com',
    password: 'password',
    role_id: 3,
    role_name: 'Auditor',
    status: 'active',
    created_at: '2024-02-01T11:15:00Z'
  }
];

function getCurrentUser(request: NextRequest) {
  const userEmail = request.headers.get('X-User-Email');
  
  if (!userEmail) {
    return null;
  }

  return users.find(u => u.email === userEmail);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.id);
    const user = users.find(u => u.user_id === userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only Super Admin can view other users
    if (currentUser.role_name !== 'Super Admin' && currentUser.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove password from response
    const { password, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      assigned_clients: [] // Mock assigned clients
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.id);
    const userIndex = users.findIndex(u => u.user_id === userId);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only Super Admin can update users
    if (currentUser.role_name !== 'Super Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updateData = await request.json();
    const user = users[userIndex];

    // Update user fields
    if (updateData.username) user.username = updateData.username;
    if (updateData.email) user.email = updateData.email;
    if (updateData.status) user.status = updateData.status;
    
    if (updateData.role_id) {
      const roleNames = {
        1: 'Super Admin',
        2: 'Client Manager',
        3: 'Auditor'
      };
      user.role_id = parseInt(updateData.role_id);
      user.role_name = roleNames[updateData.role_id as keyof typeof roleNames] || 'User';
    }

    if (updateData.password) {
      user.password = updateData.password;
    }

    // Remove password from response
    const { password, ...safeUser } = user;

    return NextResponse.json({
      message: 'User updated successfully',
      user: safeUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin can delete users
    if (currentUser.role_name !== 'Super Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userId = parseInt(params.id);
    
    // Prevent self-deletion
    if (currentUser.user_id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const userIndex = users.findIndex(u => u.user_id === userId);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    users.splice(userIndex, 1);

    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}