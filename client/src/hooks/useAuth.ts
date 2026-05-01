// ✅ New — import useContext directly here
import { useContext } from "react";
import { AuthContext } from "../context/AuthProvider";

export const useAuth = () => useContext(AuthContext);
