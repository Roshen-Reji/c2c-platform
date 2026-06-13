"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

/* ===== Types ===== */
export type UserRole = "student" | "admin" | "organiser" | "evaluator";

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  batch?: string;
  year?: string;
  status?: string;
  totalPoints?: number;
  streak?: number;
  tasksSubmitted?: number;
  tasksApproved?: number;
  testsTaken?: number;
  daysCompleted?: number;
  assignedStudents?: string[];
  assignedDayIds?: string[];
  volunteerId?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

/* ===== Context ===== */
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/* ===== Provider ===== */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Determine role by checking collections
        const uid = firebaseUser.uid;
        const collections: { name: string; role: UserRole }[] = [
          { name: "admins", role: "admin" },
          { name: "organisers", role: "organiser" },
          { name: "evaluators", role: "evaluator" },
          { name: "students", role: "student" },
        ];

        for (const col of collections) {
          try {
            const docSnap = await getDoc(doc(db, col.name, uid));
            if (docSnap.exists()) {
              const data = docSnap.data();
              const actualRole = data.role || col.role;
              setProfile({
                uid,
                email: firebaseUser.email || "",
                role: actualRole,
                fullName: data.fullName || data.name || "",
                batch: data.batch,
                year: data.year,
                status: data.status,
                totalPoints: data.totalPoints,
                streak: data.streak,
                tasksSubmitted: data.tasksSubmitted,
                tasksApproved: data.tasksApproved,
                testsTaken: data.testsTaken,
                daysCompleted: data.daysCompleted,
                assignedStudents: data.assignedStudents,
                assignedDayIds: data.assignedDayIds || data.assignedDays,
                volunteerId: data.volunteerId,
              });
              break;
            }
          } catch (err) {
            console.warn(`Failed to check ${col.name} collection:`, err);
          }
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ===== Protected Route Wrapper ===== */
export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: UserRole[];
}) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.push("/login");
      } else if (!allowedRoles.includes(profile.role)) {
        router.push("/login");
      }
    }
  }, [profile, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
        }}
      >
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
