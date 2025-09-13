import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Mock clients data
let clients = [
  {
    client_id: 1,
    client_name: 'TechCorp Inc',
    contact_person: 'John Smith',
    email: 'john@techcorp.com',
    phone: '+1-555-0123',
    aws_account_ids: ['123456789012', '123456789013'],
    gst_registered: true,
    gst_number: '27AAECB1234C1Z5',
    billing_address: '123 Tech Street\nSuite 100\nSan Francisco, CA 94105',
    invoice_preferences: 'monthly',
    default_currency: 'USD',
    status: 'active',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    client_id: 2,
    client_name: 'DataFlow Ltd',
    contact_person: 'Sarah Johnson',
    email: 'sarah@dataflow.com',
    phone: '+1-555-0456',
    aws_account_ids: ['123456789014'],
    gst_registered: false,
    gst_number: null,
    billing_address: '456 Data Avenue\nNew York, NY 10001',
    invoice_preferences: 'quarterly',
    default_currency: 'USD',
    status: 'active',
    created_at: '2024-02-20T14:15:00Z',
    updated_at: '2024-02-20T14:15:00Z'
  },
  {
    client_id: 3,
    client_name: 'CloudTech Solutions',
    contact_person: 'Raj Patel',
    email: 'raj@cloudtech.in',
    phone: '+91-98765-43210',
    aws_account_ids: ['123456789015', '123456789016'],
    gst_registered: true,
    gst_number: '29ABCDE1234F1Z5',
    billing_address: 'Plot 123, Tech Park\nBangalore, Karnataka 560001\nIndia',
    invoice_preferences: 'monthly',
    default_currency: 'INR',
    status: 'active',
    created_at: '2024-03-10T09:45:00Z',
    updated_at: '2024-03-10T09:45:00Z'
  }
];

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    let filteredClients = clients;

    // Apply search filter
    if (search) {
      filteredClients = filteredClients.filter(client =>
        client.client_name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase()) ||
        client.contact_person.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (status && status !== 'all') {
      filteredClients = filteredClients.filter(client => client.status === status);
    }

    // For Client Managers, filter to assigned clients (mock: show all for demo)
    if (decoded.role_name === 'Client Manager') {
      // In real app, filter based on user_client_mappings
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedClients = filteredClients.slice(startIndex, endIndex);

    return NextResponse.json({
      clients: paginatedClients,
      total: filteredClients.length,
      pages: Math.ceil(filteredClients.length / limit),
      current_page: page,
      per_page: limit
    });

  } catch (error) {
    console.error('List clients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (decoded.role_name === 'Auditor') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const clientData = await request.json();

    // Validate required fields
    if (!clientData.client_name || !clientData.email || !clientData.contact_person) {
      return NextResponse.json(
        { error: 'Client name, email, and contact person are required' },
        { status: 400 }
      );
    }

    // Check if client already exists
    if (clients.some(client => client.email === clientData.email)) {
      return NextResponse.json(
        { error: 'Client with this email already exists' },
        { status: 409 }
      );
    }

    // Create new client
    const newClient = {
      client_id: Math.max(...clients.map(c => c.client_id)) + 1,
      client_name: clientData.client_name,
      contact_person: clientData.contact_person,
      email: clientData.email,
      phone: clientData.phone || null,
      aws_account_ids: Array.isArray(clientData.aws_account_ids) 
        ? clientData.aws_account_ids 
        : [],
      gst_registered: clientData.gst_registered || false,
      gst_number: clientData.gst_registered ? clientData.gst_number : null,
      billing_address: clientData.billing_address || null,
      invoice_preferences: clientData.invoice_preferences || 'monthly',
      default_currency: clientData.default_currency || 'USD',
      status: clientData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    clients.push(newClient);

    return NextResponse.json({
      message: 'Client created successfully',
      client: newClient
    }, { status: 201 });

  } catch (error) {
    console.error('Create client error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}