import { createContext } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "coach" | "player";
  is_approved: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
