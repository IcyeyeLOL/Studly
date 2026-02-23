import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_KEY_KEY = 'studly_claude_api_key';

// A chat contains multiple Q&A messages. Each message: { id, question, subject, answerText, outputPreference, createdAt }
function makeChat(overrides = {}) {
  const id = overrides.id || Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  return {
    id,
    title: overrides.title || 'New chat',
    messages: Array.isArray(overrides.messages) ? overrides.messages : [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  };
}

function makeMessage(item = {}) {
  return {
    id: item.id || Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
    question: item.question || '',
    subject: item.subject || 'Other',
    answerText: item.answerText ?? '',
    outputPreference: item.outputPreference ?? 'handwritten',
    projectId: item.projectId ?? null,
    createdAt: item.createdAt ?? Date.now(),
  };
}

export const useStudlyStoreImpl = create(
  persist(
    (set, get) => ({
      userName: '',
      profileImage: null,
      recentQuestions: [],
      savedSolutions: [],
      chats: [], // { id, title, messages: [...], createdAt, updatedAt }
      activeChatId: null,
      starredChatIds: [], // chat ids that are favorited/starred
      projects: [],
      appearance: 'light', // 'light' | 'dark'
      defaultOutput: 'ask', // 'ask' | 'handwritten' | 'flowchart'
      subscriptionPlan: 'monthly', // 'monthly' | 'yearly' — Studly Pro billing interval
      notificationsEnabled: true,
      onboardingCompleted: false,
      onboardingData: {},
      lastNonAskTab: 'Chat',

      setUserName: (name) => set({ userName: (name || '').trim() }),
      setProfileImage: (uri) => set({ profileImage: uri }),
      setLastNonAskTab: (tab) => set({ lastNonAskTab: tab }),

      setActiveChatId: (id) => set({ activeChatId: id }),

      createChat: (payload = {}) => {
        const title = (payload.title || (payload.messages && payload.messages[0]?.question) || 'New chat').slice(0, 60);
        const chat = makeChat({ ...payload, title });
        set((state) => ({ chats: [chat, ...state.chats], activeChatId: chat.id }));
        return chat.id;
      },

      addMessageToChat: (chatId, messagePayload) => {
        const msg = makeMessage(messagePayload);
        set((state) => {
          if (!chatId) {
            const title = (messagePayload.question || 'New chat').slice(0, 60);
            const chat = makeChat({ title, messages: [msg] });
            return {
              chats: [chat, ...state.chats],
              activeChatId: chat.id,
            };
          }
          const now = Date.now();
          const chats = state.chats.map((c) =>
            c.id === chatId
              ? { ...c, messages: [...c.messages, msg], title: c.title || msg.question.slice(0, 60), updatedAt: now }
              : c
          );
          return { chats, activeChatId: chatId };
        });
        return msg.id;
      },

      updateMessageInChat: (chatId, messageId, patch) =>
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      removeMessageFromChat: (chatId, messageId) =>
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.filter((m) => m.id !== messageId),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      updateChatTitle: (chatId, title) =>
        set((state) => ({
          chats: state.chats.map((c) => (c.id === chatId ? { ...c, title: (title || c.title).slice(0, 60), updatedAt: Date.now() } : c)),
        })),

      setChatProject: (chatId, projectId) =>
        set((state) => ({
          chats: state.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) => ({ ...m, projectId: projectId || null })),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      removeChat: (chatId) =>
        set((state) => ({
          chats: state.chats.filter((c) => c.id !== chatId),
          activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
          starredChatIds: state.starredChatIds.filter((id) => id !== chatId),
        })),

      toggleChatStarred: (chatId) =>
        set((state) => {
          const starred = state.starredChatIds.includes(chatId);
          const next = starred ? state.starredChatIds.filter((id) => id !== chatId) : [...state.starredChatIds, chatId];
          return { starredChatIds: next };
        }),

      addRecent: (item) =>
        set((state) => {
          const entry = {
            id: item.id || Date.now().toString(),
            title: item.title || 'Untitled',
            subject: item.subject || 'Other',
            createdAt: item.createdAt ?? Date.now(),
          };
          const next = [entry, ...state.recentQuestions.filter((r) => r.id !== entry.id)].slice(0, 20);
          return { recentQuestions: next };
        }),

      addSaved: (item) =>
        set((state) => {
          const entry = {
            id: item.id || Date.now().toString(),
            question: item.question || '',
            subject: item.subject || 'Other',
            answerText: item.answerText ?? '',
            outputPreference: item.outputPreference ?? 'handwritten',
            createdAt: item.createdAt ?? Date.now(),
          };
          const exists = state.savedSolutions.some((s) => s.id === entry.id);
          const next = exists ? state.savedSolutions.map((s) => (s.id === entry.id ? entry : s)) : [entry, ...state.savedSolutions];
          return { savedSolutions: next };
        }),

      removeSaved: (id) => set((state) => ({ savedSolutions: state.savedSolutions.filter((s) => s.id !== id) })),

      addProject: (item) =>
        set((state) => {
          const entry = {
            id: item.id || Date.now().toString(),
            name: (item.name || 'Untitled').trim() || 'Untitled',
            createdAt: item.createdAt ?? Date.now(),
          };
          return { projects: [entry, ...state.projects] };
        }),
      updateProject: (id, patch) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...patch, name: (patch.name != null ? String(patch.name).trim() : p.name) || p.name } : p
          ),
        })),
      removeProject: (id) => set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),

      setAppearance: (value) => set({ appearance: value }),
      setDefaultOutput: (value) => set({ defaultOutput: value }),
      setSubscriptionPlan: (value) => set({ subscriptionPlan: value === 'yearly' ? 'yearly' : 'monthly' }),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
      setOnboardingCompleted: (val) => set({ onboardingCompleted: val }),
      setOnboardingData: (data) => set((s) => ({ onboardingData: { ...s.onboardingData, ...data } })),
    }),
    {
      name: 'studly-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userName: state.userName,
        profileImage: state.profileImage,
        recentQuestions: state.recentQuestions,
        savedSolutions: state.savedSolutions,
        chats: state.chats,
        activeChatId: state.activeChatId,
        starredChatIds: state.starredChatIds,
        projects: state.projects,
        appearance: state.appearance,
        defaultOutput: state.defaultOutput,
        subscriptionPlan: state.subscriptionPlan,
        notificationsEnabled: state.notificationsEnabled,
        onboardingCompleted: state.onboardingCompleted,
        onboardingData: state.onboardingData,
      }),
    }
  )
);

export async function getApiKey() {
  try {
    return await SecureStore.getItemAsync(API_KEY_KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value) {
  try {
    if (value == null || value === '') {
      await SecureStore.deleteItemAsync(API_KEY_KEY);
    } else {
      await SecureStore.setItemAsync(API_KEY_KEY, value);
    }
    return true;
  } catch {
    return false;
  }
}
