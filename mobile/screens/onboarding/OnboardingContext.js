import React, { createContext, useContext, useState, useCallback } from 'react';
import { useStudlyStoreImpl } from '../../store/useStudlyStore';

const OnboardingCtx = createContext(null);

const EMPTY_DATA = {
  subjects: [],
  struggles: [],
  goal: '',
  frequency: '',
};

export function OnboardingProvider({ children }) {
  const setOnboardingData = useStudlyStoreImpl((s) => s.setOnboardingData);

  const [data, setDataRaw] = useState(() => {
    const stored = useStudlyStoreImpl.getState().onboardingData;
    return {
      subjects: Array.isArray(stored.subjects) ? stored.subjects : EMPTY_DATA.subjects,
      struggles: Array.isArray(stored.struggles) ? stored.struggles : EMPTY_DATA.struggles,
      goal: stored.goal ?? EMPTY_DATA.goal,
      frequency: stored.frequency ?? EMPTY_DATA.frequency,
    };
  });

  const setData = useCallback(
    (patch) => {
      setDataRaw((prev) => {
        const next = { ...prev, ...patch };
        setOnboardingData(next);
        return next;
      });
    },
    [setOnboardingData]
  );

  return (
    <OnboardingCtx.Provider value={{ data, setData }}>
      {children}
    </OnboardingCtx.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) throw new Error('useOnboarding must be inside OnboardingProvider');
  return ctx;
}
