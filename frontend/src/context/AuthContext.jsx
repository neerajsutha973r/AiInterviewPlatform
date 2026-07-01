import { createContext, useEffect, useState } from "react";
import authService from "../services/authServcie";
import { Navigate,useNavigate } from "react-router-dom";
export const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate=useNavigate();

  useEffect(()=>{
    restoreUser();
  },[]);

  const login = (userData) => {
    console.log(userData);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate(`/`);

  };
  
  const restoreUser=async()=>{
    try{
      const user=await authService.getCurrentUser();
      setUser(user);
    }
    catch(err){
      console.log("User is not logged in");
    }
  }
  
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;