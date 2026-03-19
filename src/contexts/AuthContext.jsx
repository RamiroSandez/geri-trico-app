import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../services/supabase"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [geriatrico, setGeriatrico] = useState(null)
  const [cargando, setCargando] = useState(true)

  const fetchGeriatrico = async (userId) => {
    const { data } = await supabase
      .from("geriatricos")
      .select("*")
      .eq("user_id", userId)
      .single()
    setGeriatrico(data || null)
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchGeriatrico(session.user.id).then(() => setCargando(false))
      else setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchGeriatrico(session.user.id)
      else setGeriatrico(null)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loginConGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
    return { error }
  }

  const crearGeriatrico = async ({ nombreGeriatrico, nombreDirector, telefono }) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return { error: new Error("No hay sesión activa") }

    const { error } = await supabase.from("geriatricos").insert({
      user_id: currentUser.id,
      nombre: nombreGeriatrico,
      nombre_director: nombreDirector,
      telefono: telefono || null,
    })
    if (error) return { error }

    await fetchGeriatrico(currentUser.id)
    return { error: null }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setGeriatrico(null)
  }

  const setupPendiente = !cargando && !!user && !geriatrico

  return (
    <AuthContext.Provider value={{ user, geriatrico, cargando, setupPendiente, loginConGoogle, crearGeriatrico, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
