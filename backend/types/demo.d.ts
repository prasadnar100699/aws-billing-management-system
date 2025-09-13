export interface User {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  role_id: number;
  token?: string;
  expires_in?: number;
  status: string;
}

export interface DemoCredential {
  role: string;
  email: string;
  password: string;
  description: string;
  color: string;
  icon: string;
}