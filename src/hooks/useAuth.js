import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Configuración Firebase Local ---
const firebaseConfig = {
    apiKey: "AIzaSyBiW5cgvzvKl11tUMoS7BV8UukTw_O6eQQ",
    authDomain: "gestor-turnos-app-d9217.firebaseapp.com",
    projectId: "gestor-turnos-app-d9217",
    storageBucket: "gestor-turnos-app-d9217.firebasestorage.app",
    messagingSenderId: "1040647945988",
    appId: "1:1040647945988:web:4ee327ffbdf9aa321d5a51"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "turnos-glass-local"; // Un ID fijo para tu uso local

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [firebaseReady, setFirebaseReady] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        setIsLoading(true);
        setAuthError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Login error:", error);
            let msg = "Error al iniciar sesión";
            if (error.code === 'auth/invalid-credential') msg = "Credenciales incorrectas";
            if (error.code === 'auth/too-many-requests') msg = "Demasiados intentos. Intenta más tarde.";
            setAuthError(msg);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email, password) => {
        setIsLoading(true);
        setAuthError(null);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Registration error:", error);
            let msg = "Error al registrarse";
            if (error.code === 'auth/email-already-in-use') msg = "El correo ya está registrado";
            if (error.code === 'auth/weak-password') msg = "La contraseña es muy débil (mínimo 6 caracteres)";
            setAuthError(msg);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return {
        user,
        auth,
        db,
        appId,
        firebaseReady,
        isLoading,
        authError,
        login,
        register,
        logout
    };
};
