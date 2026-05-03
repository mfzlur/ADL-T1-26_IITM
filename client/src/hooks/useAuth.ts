import { useContext } from "react";
import { AuthContext } from "../context/AuthContext"; // ✅ new file

export const useAuth = () => useContext(AuthContext);
