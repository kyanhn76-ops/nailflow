"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";
import { OWNER_TEXT } from "@/lib/owner-text";
import { LanguageToggle } from "@/components/language-toggle";

type MySalon = {
  salon_id: string;
  salon_name: string;
  salon_slug: string;
  role: "owner" | "manager";
};

type SectionKey = "today" | "technicians" | "services" | "reports";

const SECTIONS: { key: SectionKey; icon: string }[] = [
  { key: "today", icon: "📋" },
  { key: "technicians", icon: "👩‍🔧" },
  { key: "services", icon: "💅" },
  { key: "reports", icon: "📈" },
];

const SELECTED_SALON_KEY = "nailflow-owner-salon";

function readSelectedSalon() {
  try {
    return localStorage.getItem(SELECTED_SALON_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeSelectedSalon(id: string) {
  try {
    localStorage.setItem(SELECTED_SALON_KEY, id);
  } catch {
    // Ignore storage errors
  }
}

export default function OwnerPage() {
  const { language, setLanguage } = useLanguage("vi");
  const t = OWNER_TEXT[language];

  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState(false);

  const [salons, setSalons] = useState<MySalon[]>([]);
  const [isLoadingSalons, setIsLoadingSalons] = useState(false);
  const [salonsError, setSalonsError] = useState(false);
  const [selectedSalonId, setSelectedSalonId] = useState("");

  // Check if the owner is already signed in, and listen for sign in / sign out
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const loadSalons = useCallback(async () => {
    setIsLoadingSalons(true);
    setSalonsError(false);

    const { data, error } = await supabase.rpc("owner_get_my_salons");

    setIsLoadingSalons(false);
    if (error) {
      setSalonsError(true);
      return;
    }

    const list = (data ?? []) as MySalon[];
    setSalons(list);

    const saved = readSelectedSalon();
    const initial = list.find((s) => s.salon_id === saved) ?? list[0];
    setSelectedSalonId(initial ? initial.salon_id : "");
  }, []);

  // Load the owner's salons after signing in
  const userId = session?.user.id ?? "";
  useEffect(() => {
    if (!userId) {
      setSalons([]);
      return;
    }
    loadSalons();
  }, [userId, loadSalons]);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSigningIn) return;

    setIsSigningIn(true);
    setSignInError(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSigningIn(false);
    if (error) {
      setSignInError(true);
      return;
    }
    setPassword("");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSalons([]);
    setSelectedSalonId("");
  }

  function chooseSalon(id: string) {
    setSelectedSalonId(id);
    writeSelectedSalon(id);
  }

  const toggle = <LanguageToggle language={language} onChange={setLanguage} />;

  // ----- Screens -----

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t.loading}</p>
      </main>
    );
  }

  // Screen 1: sign in
  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="mb-4 flex w-full max-w-sm justify-end">{toggle}</div>
        <form
          onSubmit={handleSignIn}
          className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md"
        >
          <p className="text-sm text-gray-500">{t.appTitle}</p>
          <h1 className="mt-1 text-2xl font-bold text-pink-600">{t.signInTitle}</h1>

          <label className="mt-6 block text-sm font-medium text-gray-700">{t.email}</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none"
          />

          <label className="mt-4 block text-sm font-medium text-gray-700">{t.password}</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none"
          />

          {signInError && <p className="mt-3 text-sm text-red-700">{t.signInFailed}</p>}

          <button
            type="submit"
            disabled={isSigningIn}
            className="mt-6 w-full rounded-full bg-pink-600 py-4 text-lg font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
          >
            {isSigningIn ? t.signingIn : t.signIn}
          </button>
        </form>
      </main>
    );
  }

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-gray-500">{t.appTitle}</p>
        <p className="text-sm text-gray-700">{session.user.email}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        {toggle}
        <button onClick={handleSignOut} className="text-sm text-gray-500 underline">
          {t.signOut}
        </button>
      </div>
    </div>
  );

  if (isLoadingSalons) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {header}
          <p className="mt-10 text-center text-gray-600">{t.loading}</p>
        </div>
      </main>
    );
  }

  // Screen 2: no salon or load error
  if (salonsError || salons.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {header}
          <div className="mt-10 rounded-2xl bg-white p-6 text-center text-gray-700 shadow-sm">
            {salonsError ? t.loadFailed : t.noSalon}
          </div>
        </div>
      </main>
    );
  }

  const salon = salons.find((s) => s.salon_id === selectedSalonId) ?? salons[0];

  // Screen 3: owner home
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        {header}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          {salons.length > 1 ? (
            <>
              <label className="block text-sm font-medium text-gray-700">{t.chooseSalon}</label>
              <select
                value={salon.salon_id}
                onChange={(e) => chooseSalon(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-lg font-semibold text-gray-900"
              >
                {salons.map((s) => (
                  <option key={s.salon_id} value={s.salon_id}>
                    {s.salon_name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{salon.salon_name}</h1>
          )}
          <p className="mt-2 inline-block rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">
            {t.roles[salon.role] ?? salon.role}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <div
              key={section.key}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-3xl">{section.icon}</p>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                  {t.comingSoon}
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold text-gray-900">
                {t.sections[section.key].title}
              </p>
              <p className="mt-1 text-sm text-gray-600">{t.sections[section.key].description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}