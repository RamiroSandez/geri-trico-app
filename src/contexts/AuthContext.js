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
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchGeriatrico(session.user.id)
      setCargando(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchGeriatrico(session.user.id)
      else setGeriatrico(null)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const registro = async ({ email, password, nombreGeriatrico, nombreDirector, telefono }) => {
    const { error: errorSignUp } = await supabase.auth.signUp({ email, password })
    if (errorSignUp) return { error: errorSignUp }

    // Login inmediato para obtener sesión activa
    const { data, error: errorLogin } = await supabase.auth.signInWithPassword({ email, password })
    if (errorLogin) return { error: errorLogin }

    const { error: errorGeriatrico } = await supabase.from("geriatricos").insert({
      user_id: data.user.id,
      nombre: nombreGeriatrico,
      nombre_director: nombreDirector,
      telefono: telefono || null,
    })
    if (errorGeriatrico) return { error: errorGeriatrico }

    await fetchGeriatrico(data.user.id)
    return { error: null }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setGeriatrico(null)
  }

  return (
    <AuthContext.Provider value={{ user, geriatrico, cargando, login, registro, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
