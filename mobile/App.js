import React, { useState, useEffect, useCallback, useRef, useMemo, Component } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  Platform,
  Modal,
  Pressable,
  Animated,
  Easing,
  LayoutAnimation,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useStudlyStoreImpl } from './store/useStudlyStore';
import { ClerkProvider, useAuth, useClerk } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { AuthLandingScreen } from './screens/AuthLandingScreen';
import { SignInScreen } from './screens/SignInScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { HandwrittenView } from './components/HandwrittenView';
import { FlowchartView } from './components/FlowchartView';
import { ChartView } from './components/ChartView';
import { parseAnswerWithCharts } from './utils/parseAnswerWithCharts';
import { SplashScreen } from './components/SplashScreen';
import { SignOutButton } from './components/SignOutButton';
import { ClerkUserSync } from './components/ClerkUserSync';
import { ProfileAccountInfo } from './components/ProfileAccountInfo';
import Constants from 'expo-constants';
import { FeatureShowcase } from './screens/FeatureShowcase';
import { useLayout } from './utils/useLayout';
import { solve as apiSolve, solveStream as apiSolveStream, healthCheck, API_URL, createCheckoutSession, getProfile } from './services/api';
import { PLAN_LABELS, getPlanLabel, getPlanLabelShort, FREE_PLAN_CTA, PLAN_PICKER_MESSAGE } from './constants/plans';
import * as WebBrowser from 'expo-web-browser';

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  dismiss = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      const short = msg.length > 80 ? msg.slice(0, 77) + '…' : msg;
      return (
        <View style={styles.errorBoundaryContainer}>
          <View style={styles.errorBanner}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage} numberOfLines={2}>{short}</Text>
            <TouchableOpacity style={styles.errorDismiss} onPress={this.dismiss} activeOpacity={0.8}>
              <Text style={styles.errorDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
          {this.props.children}
        </View>
      );
    }
    return this.props.children;
  }
}

const SIDEBAR_DARK = {
  bg: '#1a2832',
  card: '#243544',
  border: 'rgba(255,255,255,0.08)',
  text: '#e8f4f8',
  muted: '#8aa8b8',
  primary: '#5fc4e0',
};

const SidebarContext = React.createContext({ openSidebar: () => {} });

/**
 * Listens for studly://subscription-success and syncs profile (subscription_plan) from backend.
 */
function SubscriptionDeepLinkHandler() {
  const { getToken } = useAuth();
  const setSubscriptionPlan = useStudlyStoreImpl((s) => s.setSubscriptionPlan);

  useEffect(() => {
    const handleUrl = async (event) => {
      const url = event?.url || event;
      if (!url || typeof url !== 'string') return;
      if (!url.includes('subscription-success')) return;
      try {
        const token = await getToken();
        if (!token) return;
        const profile = await getProfile(token);
        if (profile?.subscription_plan === 'yearly' || profile?.subscription_plan === 'monthly') {
          setSubscriptionPlan(profile.subscription_plan);
        } else {
          setSubscriptionPlan('free');
        }
      } catch (_) {}
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(handleUrl);
    return () => sub.remove();
  }, [getToken, setSubscriptionPlan]);

  return null;
}

function ProfileAvatar({ size = 36 }) {
  const { colors } = useTheme();
  const { font } = useLayout();
  const profileImage = useStudlyStoreImpl((s) => s.profileImage);
  const userName = useStudlyStoreImpl((s) => s.userName);
  const displayName = userName.trim() || '';
  const initial = displayName ? displayName.slice(0, 1).toUpperCase() : '👤';
  const radius = size / 2;
  const fontSize = font(size * 0.4);

  if (profileImage) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: colors.border }}>
        <Image source={{ uri: profileImage }} style={{ width: size, height: size }} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize, color: colors.ink, fontWeight: '600' }}>{initial}</Text>
    </View>
  );
}

function SidebarProvider({ children }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { insets, scale } = useLayout();
  const userName = useStudlyStoreImpl((s) => s.userName);
  const savedSolutions = useStudlyStoreImpl((s) => s.savedSolutions);
  const _recentQuestions = useStudlyStoreImpl((s) => s.recentQuestions);
  const recentQuestions = useMemo(() => { const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; return _recentQuestions.filter((r) => r.createdAt >= cutoff); }, [_recentQuestions]);
  const chats = useStudlyStoreImpl((s) => s.chats);
  const setActiveChatId = useStudlyStoreImpl((s) => s.setActiveChatId);
  const starredChatIds = useStudlyStoreImpl((s) => s.starredChatIds);

  const recentChats = useMemo(() => [...chats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 10), [chats]);
  const starredChats = useMemo(() => recentChats.filter((c) => starredChatIds.includes(c.id)), [recentChats, starredChatIds]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = Math.min(320, width * 0.85);
  const sidebarSlide = useRef(new Animated.Value(-sidebarWidth)).current;

  const closeSidebar = useCallback((onDone) => {
    Animated.timing(sidebarSlide, {
      toValue: -sidebarWidth,
      duration: 260,
      useNativeDriver: true,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }).start(({ finished }) => {
      if (finished) {
        setSidebarOpen(false);
        sidebarSlide.setValue(-sidebarWidth);
        onDone?.();
      }
    });
  }, [sidebarWidth, sidebarSlide]);

  useEffect(() => {
    if (sidebarOpen) {
      sidebarSlide.setValue(-sidebarWidth);
      Animated.spring(sidebarSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 68,
        friction: 14,
      }).start();
    }
  }, [sidebarOpen, sidebarWidth, sidebarSlide]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const onNewChat = useCallback(() => {
    setActiveChatId(null);
    closeSidebar(() => navigation.dispatch(CommonActions.navigate({ name: 'Chat' })));
  }, [closeSidebar, navigation, setActiveChatId]);

  const [currentRoute, setCurrentRoute] = useState('Chat');
  useEffect(() => {
    const getRoute = () => {
      const state = navigation.getState();
      return state?.routes?.[state.index]?.name ?? 'Chat';
    };
    setCurrentRoute(getRoute());
    const unsub = navigation.addListener('state', () => setCurrentRoute(getRoute()));
    return unsub;
  }, [navigation]);
  const isChat = currentRoute === 'Chat';
  const isProjects = currentRoute === 'Projects';

  const ctxValue = useMemo(() => ({ openSidebar }), [openSidebar]);

  return (
    <SidebarContext.Provider value={ctxValue}>
      {children}
      <Modal visible={sidebarOpen} transparent animationType="none" statusBarTranslucent>
        <View style={styles.sidebarContainer}>
          <Animated.View
            style={[
              styles.sidebarPanel,
              {
                width: sidebarWidth,
                paddingTop: insets.top + scale(12),
                paddingBottom: insets.bottom + scale(12),
                paddingHorizontal: scale(14),
                transform: [{ translateX: sidebarSlide }],
              },
            ]}
          >
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Studly</Text>
              <Text style={styles.sidebarTagline}>Homework → solutions</Text>
            </View>
            <View style={styles.sidebarNavRow}>
              <TouchableOpacity
                style={[styles.sidebarNavItem, isChat && styles.sidebarNavItemActive]}
                onPress={() => {
                  setSidebarOpen(false);
                  sidebarSlide.setValue(-sidebarWidth);
                  requestAnimationFrame(() => navigation.dispatch(CommonActions.navigate({ name: 'Chat' })));
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.sidebarNavIcon}>💬</Text>
                <Text style={[styles.sidebarNavLabel, isChat && styles.sidebarNavLabelActive]}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sidebarNavItem, isProjects && styles.sidebarNavItemActive]}
                onPress={() => {
                  setSidebarOpen(false);
                  sidebarSlide.setValue(-sidebarWidth);
                  requestAnimationFrame(() => navigation.dispatch(CommonActions.navigate({ name: 'Projects' })));
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.sidebarNavIcon}>📂</Text>
                <Text style={[styles.sidebarNavLabel, isProjects && styles.sidebarNavLabelActive]}>Projects</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, minHeight: 0 }}>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={styles.sidebarSectionHeader}>
                  <Text style={styles.sidebarSectionIcon}>⭐</Text>
                  <Text style={styles.sidebarSectionLabel}>Starred</Text>
                </View>
                {starredChats.length === 0 && savedSolutions.length === 0 ? (
                  <View style={styles.sidebarEmptyWrap}>
                    <Text style={styles.sidebarEmpty}>Star chats (★) or save solutions to see them here</Text>
                  </View>
                ) : (
                  <>
                    {starredChats.slice(0, 5).map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.sidebarItem}
                        onPress={() => {
                          setActiveChatId(c.id);
                          closeSidebar(() => navigation.dispatch(CommonActions.navigate({ name: 'Chat' })));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.sidebarItemText} numberOfLines={1}>★ {(c.title || 'Chat').slice(0, 36)}{(c.title || '').length > 36 ? '…' : ''}</Text>
                        <Text style={styles.sidebarItemMeta}>{c.messages?.length || 0} messages</Text>
                      </TouchableOpacity>
                    ))}
                    {savedSolutions.slice(0, 6 - starredChats.length).map((s) => (
                      <TouchableOpacity key={'s-' + s.id} style={styles.sidebarItem} onPress={() => closeSidebar()} activeOpacity={0.7}>
                        <Text style={styles.sidebarItemText} numberOfLines={1}>{(s.question || 'Untitled').slice(0, 40)}{(s.question || '').length > 40 ? '…' : ''}</Text>
                        <Text style={styles.sidebarItemMeta}>{s.subject}</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                <View style={[styles.sidebarSectionHeader, styles.sidebarSectionHeaderSpaced]}>
                  <Text style={styles.sidebarSectionIcon}>🕐</Text>
                  <Text style={styles.sidebarSectionLabel}>Recent chats</Text>
                </View>
                {recentChats.length === 0 ? (
                  <View style={styles.sidebarEmptyWrap}>
                    <Text style={styles.sidebarEmptyIcon}>💬</Text>
                    <Text style={styles.sidebarEmpty}>Your recent chats will show here</Text>
                  </View>
                ) : (
                  recentChats.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.sidebarItem}
                      onPress={() => {
                        setActiveChatId(c.id);
                        closeSidebar(() => navigation.dispatch(CommonActions.navigate({ name: 'Chat' })));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sidebarItemText} numberOfLines={1}>{c.title || 'Chat'}</Text>
                      <Text style={styles.sidebarItemMeta}>{c.messages?.length || 0} messages</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
            <TouchableOpacity style={styles.sidebarAllChats} onPress={() => closeSidebar(() => navigation.navigate('Saved'))} activeOpacity={0.7}>
              <Text style={styles.sidebarAllChatsText}>All saved ›</Text>
            </TouchableOpacity>
            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.sidebarUserRow} onPress={() => closeSidebar(() => navigation.navigate('Profile'))} activeOpacity={0.7}>
                <ProfileAvatar size={36} />
                <Text style={styles.sidebarUserName} numberOfLines={1}>{userName.trim() || 'Guest'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sidebarNewBtn, { backgroundColor: colors.primary }]} onPress={onNewChat}>
                <Text style={styles.sidebarNewBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          <Pressable style={styles.sidebarOverlay} onPress={() => closeSidebar()} />
        </View>
      </Modal>
    </SidebarContext.Provider>
  );
}

function AskScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { insets, padding, scale, font } = useLayout();
  const addRecent = useStudlyStoreImpl((s) => s.addRecent);
  const lastNonAskTab = useStudlyStoreImpl((s) => s.lastNonAskTab);
  const userName = useStudlyStoreImpl((s) => s.userName);
  const savedSolutions = useStudlyStoreImpl((s) => s.savedSolutions);
  const _recentQuestions = useStudlyStoreImpl((s) => s.recentQuestions);
  const recentQuestions = useMemo(() => { const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; return _recentQuestions.filter((r) => r.createdAt >= cutoff); }, [_recentQuestions]);
  const projects = useStudlyStoreImpl((s) => s.projects);
  const addProject = useStudlyStoreImpl((s) => s.addProject);
  const defaultOutput = useStudlyStoreImpl((s) => s.defaultOutput);
  const setDefaultOutput = useStudlyStoreImpl((s) => s.setDefaultOutput);
  const openSidebar = React.useContext(SidebarContext)?.openSidebar;
  const chats = useStudlyStoreImpl((s) => s.chats);
  const activeChatId = useStudlyStoreImpl((s) => s.activeChatId);
  const setActiveChatId = useStudlyStoreImpl((s) => s.setActiveChatId);
  const addMessageToChat = useStudlyStoreImpl((s) => s.addMessageToChat);
  const removeChat = useStudlyStoreImpl((s) => s.removeChat);
  const starredChatIds = useStudlyStoreImpl((s) => s.starredChatIds);
  const toggleChatStarred = useStudlyStoreImpl((s) => s.toggleChatStarred);
  const removeSaved = useStudlyStoreImpl((s) => s.removeSaved);
  const updateMessageInChat = useStudlyStoreImpl((s) => s.updateMessageInChat);
  const removeMessageFromChat = useStudlyStoreImpl((s) => s.removeMessageFromChat);
  const subscriptionPlan = useStudlyStoreImpl((s) => s.subscriptionPlan);
  const setSubscriptionPlan = useStudlyStoreImpl((s) => s.setSubscriptionPlan);
  const { getToken } = useAuth();

  const openStudlyProCheckout = useCallback(async (plan) => {
    try {
      const token = await getToken();
      if (!token) { Alert.alert('Error', 'Not signed in.'); return; }
      const data = await createCheckoutSession(plan, token);
      if (data?.url) await WebBrowser.openBrowserAsync(data.url);
      else Alert.alert('Error', 'Could not open checkout.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not start checkout.');
    }
  }, [getToken]);

  useFocusEffect(useCallback(() => {
    useStudlyStoreImpl.getState().setLastNonAskTab('Chat');
  }, []));

  const currentChat = activeChatId ? chats.find((c) => c.id === activeChatId) : null;
  const hasMessages = currentChat && currentChat.messages.length > 0;

  const [question, setQuestion] = useState('');
  const [subject, setSubject] = useState('Other');
  const [loading, setLoading] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [resultView, setResultView] = useState('handwritten');
  const [attachments, setAttachments] = useState([]); // { id, uri, name }
  const [addToChatModalVisible, setAddToChatModalVisible] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const questionInputRef = useRef(null);
  const threadScrollRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const scrollContentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);

  const handleScrollEvent = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom < 80;
  };

  const handleContentSizeChange = (_w, h) => {
    scrollContentHeightRef.current = h;
  };

  const handleScrollLayout = (e) => {
    scrollViewHeightRef.current = e.nativeEvent.layout.height;
  };

  const styleLabel = { ask: 'Normal', handwritten: 'Handwritten', flowchart: 'Flowchart' };
  const styleDisplay = styleLabel[defaultOutput] ?? 'Normal';
  const selectedProjectName = selectedProjectId ? (projects.find((p) => p.id === selectedProjectId)?.name ?? 'None') : 'None';

  const showAddToProjectPicker = () => {
    const options = [
      { text: 'None', onPress: () => setSelectedProjectId(null) },
      ...projects.map((p) => ({ text: p.name, onPress: () => setSelectedProjectId(p.id) })),
      { text: 'Create new project', onPress: () => { const newId = Date.now().toString(); addProject({ id: newId, name: 'New project' }); setSelectedProjectId(newId); } },
      { text: 'Cancel', style: 'cancel' },
    ];
    Alert.alert('Add to project', 'Select a project for this question', options);
  };

  const showChooseStylePicker = () => {
    Alert.alert('Choose style', 'How should solutions be displayed?', [
      { text: 'Normal', onPress: () => setDefaultOutput('ask') },
      { text: 'Handwritten', onPress: () => setDefaultOutput('handwritten') },
      { text: 'Flowchart', onPress: () => setDefaultOutput('flowchart') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext({
        duration: 320,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
        create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext({
        duration: 280,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
        create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const subjects = ['Math', 'Science', 'English', 'History', 'Computer Science', 'Business', 'Economics', 'Psychology', 'Philosophy', 'Art', 'Other'];

  const onBack = () => navigation.navigate(lastNonAskTab || 'Saved');

  const MAX_ATTACHMENTS = 5;
  const addToAttachments = (items) => {
    const newFiles = items.map((f, i) => ({ id: `${Date.now()}-${i}`, uri: f.uri, name: f.name || 'File' }));
    setAttachments((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_ATTACHMENTS) {
        Alert.alert('Limit reached', `You can attach up to ${MAX_ATTACHMENTS} files.`);
        return combined.slice(0, MAX_ATTACHMENTS);
      }
      return combined;
    });
  };

  const pickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setAddToChatModalVisible(false);
        Alert.alert('Camera', 'Camera permission is required to take photos.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!res.canceled) {
        addToAttachments(res.assets.map((a) => ({ uri: a.uri, name: `Photo ${new Date().toLocaleTimeString()}.jpg` })));
      }
    } catch (e) {
      Alert.alert('Camera', 'Could not open camera. ' + (e?.message || ''));
    } finally {
      setAddToChatModalVisible(false);
    }
  };

  const pickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setAddToChatModalVisible(false);
        Alert.alert('Photos', 'Photo library permission is required.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true });
      if (!res.canceled) {
        addToAttachments(res.assets.map((a) => ({ uri: a.uri, name: a.fileName || `Image ${new Date().toLocaleTimeString()}.jpg` })));
      }
    } catch (e) {
      Alert.alert('Photos', 'Could not open photo library. ' + (e?.message || ''));
    } finally {
      setAddToChatModalVisible(false);
    }
  };

  const pickFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.*'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!res.canceled) {
        addToAttachments((res.assets || []).map((f) => ({ uri: f.uri, name: f.name || 'File' })));
      }
    } catch (e) {
      Alert.alert('Files', 'Could not open file picker. ' + (e?.message || ''));
    } finally {
      setAddToChatModalVisible(false);
    }
  };

  const removeAttachment = (id) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const isImageAttachment = (a) => {
    const ext = (a.name || a.uri || '').split('.').pop()?.toLowerCase()?.split('?')[0] || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const resolveOutputFormat = () => {
    if (defaultOutput === 'ask') return null;
    return defaultOutput || resultView;
  };

  const doSolveWithFormat = async (outputFormat) => {
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    setLoading(true);
    isNearBottomRef.current = true;
    let streamChatId = null;
    let streamMsgId = null;
    try {
      const health = await healthCheck();
      const token = await getToken();
      streamMsgId = addMessageToChat(activeChatId, {
        question: q,
        subject,
        answerText: '',
        outputPreference: outputFormat,
        projectId: selectedProjectId,
      });
      streamChatId = useStudlyStoreImpl.getState().activeChatId;
      setPendingQuestion(null);
      let accumulated = '';
      let scrollTimer = null;
      const scheduleScroll = () => {
        if (scrollTimer || !isNearBottomRef.current) return;
        scrollTimer = setTimeout(() => {
          scrollTimer = null;
          if (isNearBottomRef.current) {
            threadScrollRef.current?.scrollToEnd?.({ animated: false });
          }
        }, 80);
      };
      await apiSolveStream(
        {
          question: q,
          subject,
          output_preference: outputFormat,
          attachment_urls: attachments.map((a) => a.uri),
          web_search: webSearchEnabled,
          token: token ?? undefined,
          baseUrl: health._baseUrl,
        },
        {
          onChunk(t) {
            accumulated += t;
            updateMessageInChat(streamChatId, streamMsgId, { answerText: accumulated });
            scheduleScroll();
          },
          onDone(data) {
            updateMessageInChat(streamChatId, streamMsgId, { answerText: data.answerText });
            addRecent({
              id: Date.now().toString(),
              title: q.slice(0, 50) + (q.length > 50 ? '…' : ''),
              subject,
              createdAt: Date.now(),
            });
            setAttachments([]);
            if (isNearBottomRef.current) {
              setTimeout(() => threadScrollRef.current?.scrollToEnd?.({ animated: true }), 100);
            }
          },
          onError(err) {
            const msg = err?.message || 'Stream failed';
            updateMessageInChat(streamChatId, streamMsgId, { answerText: `Error: ${msg}` });
            Alert.alert('Error', msg);
          },
        }
      );
    } catch (err) {
      if (streamMsgId != null && streamChatId != null) {
        removeMessageFromChat(streamChatId, streamMsgId);
      }
      Alert.alert('Error', err?.message || 'Could not get solution. Please try again.');
      setQuestion(q);
    } finally {
      setLoading(false);
      setPendingQuestion(null);
    }
  };

  const onSolve = () => {
    const q = question.trim();
    if (!q) return;
    const outputFormat = resolveOutputFormat();
    if (outputFormat !== null) {
      doSolveWithFormat(outputFormat);
      return;
    }
    // defaultOutput === 'ask': show picker before solving
    Alert.alert(
      'How would you like this solution displayed?',
      'Choose a format for this question.',
      [
        { text: 'Handwritten', onPress: () => doSolveWithFormat('handwritten') },
        { text: 'Flowchart', onPress: () => doSolveWithFormat('flowchart') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const onNewChat = () => {
    setActiveChatId(null);
    setQuestion('');
    setSubject('Other');
    setAttachments([]);
  };

  const AskHeader = ({ showAttach = false }) => (
    <View style={[styles.askHeader, { paddingTop: insets.top + 8, paddingBottom: scale(12), borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => openSidebar?.()} style={[styles.backButton, { padding: scale(8) }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={{ fontSize: font(24), color: colors.ink, fontWeight: '300' }}>☰</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      {showAttach && (
        <TouchableOpacity onPress={() => setAddToChatModalVisible(true)} style={[styles.attachButton, { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: font(22), color: colors.primary, fontWeight: '300' }}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Thread view: show all messages in current chat + input
  if (hasMessages) {
    return (
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: insets.top + 8, paddingHorizontal: padding, paddingBottom: scale(12), borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}>
            <TouchableOpacity onPress={() => openSidebar?.()} style={{ padding: scale(8) }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={{ fontSize: font(24), color: colors.ink, fontWeight: '300' }}>☰</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: font(14), color: colors.ink, fontWeight: '600', marginHorizontal: scale(8) }} numberOfLines={1}>{currentChat?.title || 'Chat'}</Text>
            <TouchableOpacity onPress={() => activeChatId && toggleChatStarred(activeChatId)} style={{ padding: scale(8) }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={{ fontSize: font(20), color: starredChatIds.includes(activeChatId) ? '#f1c40f' : colors.muted }}>{starredChatIds.includes(activeChatId) ? '★' : '☆'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onNewChat} style={{ padding: scale(8) }}>
              <Text style={{ fontSize: font(13), color: colors.primary, fontWeight: '600' }}>New chat</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={threadScrollRef}
            key={`thread-${activeChatId ?? 'none'}-${isDark ? 'dark' : 'light'}`}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: padding, paddingTop: scale(16), paddingBottom: scale(24) }}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScrollEvent}
            onContentSizeChange={handleContentSizeChange}
            onLayout={handleScrollLayout}
            scrollEventThrottle={16}
          >
            {currentChat.messages.map((msg) => (
              <View key={msg.id} style={{ marginBottom: scale(20) }}>
                <View style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.primary + '22', paddingVertical: scale(10), paddingHorizontal: scale(14), borderRadius: scale(14), borderBottomRightRadius: 4 }}>
                  <Text style={{ fontSize: font(14), color: colors.ink }}>{msg.question}</Text>
                  <Text style={{ fontSize: font(11), color: colors.muted, marginTop: 4 }}>{msg.subject}</Text>
                </View>
                <View style={{ marginTop: scale(8), backgroundColor: colors.card, padding: scale(14), borderRadius: scale(14), borderWidth: 1, borderColor: colors.border }}>
                  {parseAnswerWithCharts(msg.answerText || '').map((seg, idx) =>
                    seg.type === 'text' ? (
                      msg.outputPreference === 'flowchart' ? (
                        <FlowchartView key={idx} text={seg.value} subject={msg.subject} colors={colors} isDark={isDark} scale={scale} font={font} />
                      ) : (
                        <HandwrittenView key={idx} text={seg.value} subject={idx === 0 ? msg.subject : null} colors={colors} isDark={isDark} scale={scale} font={font} />
                      )
                    ) : (
                      <ChartView key={idx} chartType={seg.chartType} title={seg.title} yAxisLabel={seg.yAxisLabel} labels={seg.labels} values={seg.values} seriesLabels={seg.seriesLabels} seriesValues={seg.seriesValues} xValues={seg.xValues} secondaryValues={seg.secondaryValues} secondaryLabel={seg.secondaryLabel} logScale={seg.logScale} colors={colors} isDark={isDark} scale={scale} font={font} />
                    )
                  )}
                  {savedSolutions.some((s) => s.id === msg.id) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(10), gap: scale(12) }}>
                      <Text style={{ fontSize: font(12), color: colors.muted, fontWeight: '600' }}>Saved ✓</Text>
                      <TouchableOpacity
                        onPress={() => {
                          removeSaved(msg.id);
                        }}
                      >
                        <Text style={{ fontSize: font(12), color: colors.primary, fontWeight: '600' }}>Unsave</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{ marginTop: scale(10) }}
                      onPress={() => {
                        useStudlyStoreImpl.getState().addSaved({
                          id: msg.id,
                          question: msg.question,
                          subject: msg.subject,
                          answerText: msg.answerText,
                          outputPreference: msg.outputPreference,
                          createdAt: msg.createdAt,
                        });
                        Alert.alert('Saved', 'Solution saved to Saved tab.');
                      }}
                    >
                      <Text style={{ fontSize: font(12), color: colors.primary, fontWeight: '600' }}>Save this answer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            {pendingQuestion && (
              <View style={{ marginBottom: scale(20) }}>
                <View style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.primary + '22', paddingVertical: scale(10), paddingHorizontal: scale(14), borderRadius: scale(14), borderBottomRightRadius: 4 }}>
                  <Text style={{ fontSize: font(14), color: colors.ink }}>{pendingQuestion}</Text>
                  <Text style={{ fontSize: font(11), color: colors.muted, marginTop: 4 }}>{subject}</Text>
                </View>
                <View style={{ marginTop: scale(8), padding: scale(16), alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ fontSize: font(13), color: colors.muted, marginTop: 8 }}>Solving…</Text>
                </View>
              </View>
            )}
          </ScrollView>
          <View style={{ paddingHorizontal: padding, paddingTop: scale(8), paddingBottom: insets.bottom + scale(8), backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setAddToChatModalVisible(true)}
                style={{ width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderAccent, alignItems: 'center', justifyContent: 'center', marginRight: scale(8) }}
              >
                <Text style={{ fontSize: font(22), color: colors.primary, fontWeight: '300' }}>+</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: scale(22), borderWidth: 1, borderColor: colors.border, minHeight: scale(44), paddingLeft: scale(12), paddingRight: scale(8), paddingVertical: scale(8) }}>
                <TextInput
                  placeholder="Ask a follow-up…"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  value={question}
                  onChangeText={setQuestion}
                  style={{ flex: 1, fontSize: font(15), color: colors.ink, paddingVertical: 0, maxHeight: scale(100) }}
                />
              </View>
              <TouchableOpacity
                onPress={onSolve}
                disabled={!question.trim() || loading}
                style={{ marginLeft: scale(8), width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: question.trim() && !loading ? 1 : 0.5 }}
              >
                <Text style={{ fontSize: font(18), color: '#fff' }}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <>
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior="padding" keyboardVerticalOffset={0}>
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Claude-style top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: insets.top + 8, paddingHorizontal: padding, paddingBottom: scale(12), borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}>
        <TouchableOpacity onPress={() => openSidebar?.()} style={{ padding: scale(8) }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ fontSize: font(24), color: colors.ink, fontWeight: '300' }}>☰</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: font(18), color: colors.ink, fontWeight: '700', fontFamily: 'Georgia' }}>Studly</Text>
          <Text style={{ fontSize: font(11), color: colors.muted, marginTop: 2 }}>Homework → solutions</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <ProfileAvatar size={scale(36)} />
        </TouchableOpacity>
      </View>

      {/* Studly Pro / Free — current plan */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: scale(10),
          paddingHorizontal: padding,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
        onPress={() => Alert.alert('Plan', 'Choose your plan.', [
          { text: PLAN_LABELS.free, onPress: () => setSubscriptionPlan('free') },
          { text: PLAN_LABELS.monthly, onPress: () => openStudlyProCheckout('monthly') },
          { text: PLAN_LABELS.yearly + ' (save more)', onPress: () => openStudlyProCheckout('yearly') },
          { text: 'Cancel', style: 'cancel' },
        ])}
      >
        <Text style={{ fontSize: font(13), color: colors.ink, fontWeight: '500' }}>
          {getPlanLabel(subscriptionPlan)}
        </Text>
        <Text style={{ fontSize: font(13), color: colors.primary, fontWeight: '600' }}>Change plan</Text>
      </TouchableOpacity>

      {/* Main: centered greeting */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: padding }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {loading ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: font(14), color: colors.muted, marginTop: scale(12) }}>Solving…</Text>
          </View>
        ) : (
          <>
            <View style={{ width: scale(52), height: scale(52), borderRadius: scale(26), backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: scale(14) }}>
              <Text style={{ fontSize: font(26) }}>✏️</Text>
            </View>
            <Text style={{ fontSize: font(19), color: colors.ink, fontWeight: '600', textAlign: 'center', maxWidth: 280 }}>How can I help you today?</Text>
            <Text style={{ fontSize: font(13), color: colors.muted, marginTop: scale(6), textAlign: 'center', paddingHorizontal: scale(8) }}>Paste a question or attach a file to get started.</Text>
            {attachments.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginTop: scale(16), justifyContent: 'center' }}>
                {attachments.map((a) => (
                  <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingVertical: scale(6), paddingLeft: scale(10), paddingRight: scale(6), borderRadius: scale(10), borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: font(12), color: colors.ink, maxWidth: 100 }} numberOfLines={1}>{a.name}</Text>
                    <TouchableOpacity onPress={() => removeAttachment(a.id)} style={{ padding: scale(4), marginLeft: scale(4) }}>
                      <Text style={{ fontSize: font(16), color: colors.muted }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Subject chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(6), paddingHorizontal: padding, paddingTop: scale(6), paddingBottom: scale(8) }}>
        {subjects.map((s) => (
          <TouchableOpacity
            key={s}
            style={{
              paddingVertical: scale(6),
              paddingHorizontal: scale(12),
              borderRadius: scale(20),
              backgroundColor: subject === s ? colors.primary : colors.card,
              borderWidth: 1,
              borderColor: subject === s ? colors.primary : colors.border,
            }}
            onPress={() => setSubject(s)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: font(12), color: subject === s ? '#fff' : colors.ink, fontWeight: '600' }}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input bar: in flow so KeyboardAvoidingView pushes it above keyboard */}
      <View
        style={{
          paddingBottom: insets.bottom,
          paddingHorizontal: padding,
          paddingTop: scale(4),
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {/* Attachment previews above the input (like reference: image/file visible after pick) */}
        {attachments.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: scale(10), alignItems: 'center' }}>
            {attachments.map((a) => (
              <View key={a.id} style={{ position: 'relative' }}>
                {isImageAttachment(a) ? (
                  <View style={{ width: scale(56), height: scale(56), borderRadius: scale(10), overflow: 'hidden', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
                    <Image source={{ uri: a.uri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, paddingVertical: scale(8), paddingLeft: scale(10), paddingRight: scale(32), borderRadius: scale(10), borderWidth: 1, borderColor: colors.border, maxWidth: scale(140) }}>
                    <Text style={{ fontSize: font(18), marginRight: scale(6) }}>📄</Text>
                    <Text style={{ fontSize: font(12), color: colors.ink }} numberOfLines={1}>{a.name || 'File'}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => removeAttachment(a.id)}
                  style={{ position: 'absolute', top: -scale(4), right: -scale(4), width: scale(22), height: scale(22), borderRadius: scale(11), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: font(14), color: colors.muted, fontWeight: '600' }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: scale(22), borderWidth: 1, borderColor: colors.border, minHeight: scale(44), paddingLeft: scale(48), paddingRight: scale(8), paddingVertical: scale(8) }}>
            <TouchableOpacity
              onPress={() => setAddToChatModalVisible(true)}
              style={{
                position: 'absolute',
                left: scale(6),
                bottom: scale(6),
                width: scale(32),
                height: scale(32),
                borderRadius: scale(16),
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.borderAccent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: font(18), color: colors.primary, fontWeight: '300' }}>+</Text>
            </TouchableOpacity>
            <TextInput
              ref={questionInputRef}
              placeholder="Paste or type your question…"
              placeholderTextColor={colors.placeholder}
              multiline
              value={question}
              onChangeText={setQuestion}
              style={{ flex: 1, fontSize: font(15), color: colors.ink, paddingVertical: 0, maxHeight: scale(100) }}
            />
          </View>
          <TouchableOpacity
            onPress={onSolve}
            disabled={!question.trim()}
            style={{ marginLeft: scale(8), width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: question.trim() ? 1 : 0.5 }}
          >
            <Text style={{ fontSize: font(18), color: '#fff' }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </KeyboardAvoidingView>

      <Modal visible={addToChatModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddToChatModalVisible(false)} />
          <View style={[styles.addToChatCard, { backgroundColor: colors.card, borderRadius: scale(16), paddingBottom: insets.bottom + scale(16), zIndex: 1 }]}>
            <View style={[styles.addToChatHeader, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: scale(12), paddingHorizontal: scale(16) }]}>
              <TouchableOpacity onPress={() => setAddToChatModalVisible(false)} style={{ width: scale(36), alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: font(22), color: colors.ink, fontWeight: '300' }}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.addToChatTitle, { fontSize: font(18), color: colors.ink, flex: 1, textAlign: 'center' }]}>Add to Chat</Text>
              <View style={{ width: scale(36) }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: scale(24), paddingHorizontal: scale(16), gap: scale(16) }}>
              <TouchableOpacity style={[styles.addToChatOption, { backgroundColor: colors.bg, borderRadius: scale(14), padding: scale(16), flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border }]} onPress={pickCamera}>
                <Text style={{ fontSize: font(28), marginBottom: scale(8) }}>📷</Text>
                <Text style={{ fontSize: font(13), color: colors.ink, fontWeight: '600' }}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addToChatOption, { backgroundColor: colors.bg, borderRadius: scale(14), padding: scale(16), flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border }]} onPress={pickPhotos}>
                <Text style={{ fontSize: font(28), marginBottom: scale(8) }}>🖼️</Text>
                <Text style={{ fontSize: font(13), color: colors.ink, fontWeight: '600' }}>Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addToChatOption, { backgroundColor: colors.bg, borderRadius: scale(14), padding: scale(16), flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border }]} onPress={pickFiles}>
                <Text style={{ fontSize: font(28), marginBottom: scale(8) }}>📄</Text>
                <Text style={{ fontSize: font(13), color: colors.ink, fontWeight: '600' }}>Files</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: scale(16) }} />
            <View style={[styles.addToChatRow, { paddingVertical: scale(14), paddingHorizontal: scale(16), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                <Text style={{ fontSize: font(20) }}>🌐</Text>
                <Text style={{ fontSize: font(15), color: colors.ink }}>Web search</Text>
              </View>
              <Switch value={webSearchEnabled} onValueChange={setWebSearchEnabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: scale(16) }} />
            <TouchableOpacity style={[styles.addToChatRow, { paddingVertical: scale(14), paddingHorizontal: scale(16), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={showAddToProjectPicker} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                <Text style={{ fontSize: font(20) }}>📁</Text>
                <Text style={{ fontSize: font(15), color: colors.ink }}>Add to project</Text>
              </View>
              <Text style={{ fontSize: font(14), color: colors.muted }}>{selectedProjectName}</Text>
              <Text style={{ fontSize: font(16), color: colors.muted }}>›</Text>
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: scale(16) }} />
            <TouchableOpacity style={[styles.addToChatRow, { paddingVertical: scale(14), paddingHorizontal: scale(16), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={showChooseStylePicker} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                <Text style={{ fontSize: font(20) }}>✒️</Text>
                <Text style={{ fontSize: font(15), color: colors.ink }}>Choose style</Text>
              </View>
              <Text style={{ fontSize: font(14), color: colors.muted }}>{styleDisplay}</Text>
              <Text style={{ fontSize: font(16), color: colors.muted }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params || {};
  const { colors } = useTheme();
  const { insets, padding, scale, font } = useLayout();
  const projects = useStudlyStoreImpl((s) => s.projects);
  const chats = useStudlyStoreImpl((s) => s.chats);
  const updateProject = useStudlyStoreImpl((s) => s.updateProject);
  const removeProject = useStudlyStoreImpl((s) => s.removeProject);
  const setActiveChatId = useStudlyStoreImpl((s) => s.setActiveChatId);
  const setChatProject = useStudlyStoreImpl((s) => s.setChatProject);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [addChatModalVisible, setAddChatModalVisible] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const chatsInProject = project
    ? chats.filter((c) => c.messages.some((m) => m.projectId === projectId))
    : [];
  const sortedChats = [...chatsInProject].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const chatIdsInProject = new Set(chatsInProject.map((c) => c.id));
  const chatsNotInProject = chats.filter((c) => !chatIdsInProject.has(c.id));

  const openRename = () => {
    if (!project) return;
    setRenameDraft(project.name);
    setRenameModalVisible(true);
  };

  const submitRename = () => {
    const name = renameDraft.trim();
    if (name && projectId) {
      updateProject(projectId, { name });
      setRenameModalVisible(false);
    }
  };

  const onDeleteProject = () => {
    if (!project) return;
    Alert.alert('Delete project', `Remove "${project.name}"? This won't delete your chats.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeProject(projectId); navigation.goBack(); } },
    ]);
  };

  const openChat = (chatId) => {
    setActiveChatId(chatId);
    navigation.navigate('Chat');
  };

  const addChatToProject = (chatId) => {
    setChatProject(chatId, projectId);
    setAddChatModalVisible(false);
  };

  const removeChatFromProject = (chatId, e) => {
    if (e) e.stopPropagation();
    setChatProject(chatId, null);
  };

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: font(15), color: colors.muted }}>Project not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: scale(16), paddingVertical: scale(10), paddingHorizontal: scale(20), backgroundColor: colors.primary, borderRadius: scale(10) }}>
          <Text style={{ fontSize: font(14), color: '#fff', fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: insets.top + 4, paddingHorizontal: padding, paddingBottom: scale(12), borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: font(20), color: colors.ink }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: scale(8) }}>
          <Text style={{ fontSize: font(18), color: colors.ink, fontWeight: '700' }} numberOfLines={1}>{project.name}</Text>
          <Text style={{ fontSize: font(12), color: colors.muted, marginTop: 2 }}>{chatsInProject.length} {chatsInProject.length === 1 ? 'chat' : 'chats'}</Text>
        </View>
        <TouchableOpacity onPress={openRename} style={{ width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: font(18), color: colors.ink }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDeleteProject} style={{ width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: font(16), color: colors.muted }}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: padding, paddingTop: scale(16), paddingBottom: scale(24) }}
        keyboardShouldPersistTaps="handled"
      >
        {sortedChats.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: scale(40) }}>
            <Text style={{ fontSize: 48, marginBottom: scale(16) }}>💬</Text>
            <Text style={{ fontSize: font(15), color: colors.muted, textAlign: 'center', maxWidth: 260 }}>
              No chats in this project yet. Tap the + button below to add previous chats here.
            </Text>
          </View>
        ) : (
          sortedChats.map((chat) => (
            <View
              key={chat.id}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: scale(14), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: colors.border }}
            >
              <TouchableOpacity
                onPress={() => openChat(chat.id)}
                activeOpacity={0.7}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: font(15), color: colors.ink, fontWeight: '600', flex: 1 }} numberOfLines={2}>{chat.title || 'Chat'}</Text>
                <Text style={{ fontSize: font(12), color: colors.muted }}>{chat.messages?.length ?? 0} messages</Text>
                <Text style={{ fontSize: font(18), color: colors.muted, marginLeft: scale(8) }}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => removeChatFromProject(chat.id, e)} style={{ padding: scale(8), marginLeft: scale(4) }} hitSlop={8}>
                <Text style={{ fontSize: font(14), color: colors.muted }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <View
        style={{
          paddingBottom: insets.bottom,
          paddingHorizontal: padding,
          paddingTop: scale(12),
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => setAddChatModalVisible(true)}
          style={{ alignSelf: 'center', width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: font(22), color: '#fff', fontWeight: '300' }}>+</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={renameModalVisible} transparent animationType="fade">
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: scale(24) }]} onPress={() => setRenameModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderRadius: scale(16), padding: scale(20), borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: font(16), color: colors.ink, fontWeight: '600', marginBottom: scale(12) }}>Rename project</Text>
            <TextInput
              placeholder="Project name"
              placeholderTextColor={colors.placeholder}
              value={renameDraft}
              onChangeText={setRenameDraft}
              autoFocus
              style={{ backgroundColor: colors.bg, borderRadius: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: font(15), color: colors.ink, borderWidth: 1, borderColor: colors.border }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: scale(16), gap: scale(8) }}>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)} style={{ paddingVertical: scale(10), paddingHorizontal: scale(16) }}>
                <Text style={{ fontSize: font(15), color: colors.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRename} style={{ paddingVertical: scale(10), paddingHorizontal: scale(16), backgroundColor: colors.primary, borderRadius: scale(10) }}>
                <Text style={{ fontSize: font(15), color: '#fff', fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addChatModalVisible} transparent animationType="fade">
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }]} onPress={() => setAddChatModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), maxHeight: '70%', paddingBottom: insets.bottom + scale(16) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scale(16), paddingHorizontal: padding, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: font(18), color: colors.ink, fontWeight: '700' }}>Add chat to {project.name}</Text>
              <TouchableOpacity onPress={() => setAddChatModalVisible(false)} style={{ padding: scale(8) }}>
                <Text style={{ fontSize: font(22), color: colors.muted }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: padding }}>
              {chatsNotInProject.length === 0 ? (
                <Text style={{ fontSize: font(15), color: colors.muted, textAlign: 'center', paddingVertical: scale(24) }}>No other chats to add. All your chats are already in this project or you have no chats yet.</Text>
              ) : (
                chatsNotInProject.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    onPress={() => addChatToProject(chat.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scale(14), paddingHorizontal: scale(4), borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <Text style={{ fontSize: font(15), color: colors.ink, fontWeight: '500', flex: 1 }} numberOfLines={2}>{chat.title || 'Chat'}</Text>
                    <Text style={{ fontSize: font(14), color: colors.primary, fontWeight: '600' }}>Add</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ProjectsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { insets, padding, scale, font } = useLayout();
  const openSidebar = React.useContext(SidebarContext)?.openSidebar;
  const userName = useStudlyStoreImpl((s) => s.userName);
  const projects = useStudlyStoreImpl((s) => s.projects);
  const addProject = useStudlyStoreImpl((s) => s.addProject);
  const updateProject = useStudlyStoreImpl((s) => s.updateProject);
  const removeProject = useStudlyStoreImpl((s) => s.removeProject);
  const [projectTab, setProjectTab] = useState('yours');
  const [searchQuery, setSearchQuery] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createDraft, setCreateDraft] = useState('New project');

  useFocusEffect(useCallback(() => {
    useStudlyStoreImpl.getState().setLastNonAskTab('Projects');
  }, []));

  const onAddProject = () => {
    setCreateDraft('New project');
    setCreateModalVisible(true);
  };

  const onSubmitCreate = () => {
    const name = createDraft.trim() || 'New project';
    addProject({ name });
    setCreateModalVisible(false);
  };

  const openRename = (p, e) => {
    if (e) e.stopPropagation();
    setRenameProjectId(p.id);
    setRenameDraft(p.name);
    setRenameModalVisible(true);
  };

  const submitRename = () => {
    const name = renameDraft.trim();
    if (name && renameProjectId) {
      updateProject(renameProjectId, { name });
      setRenameModalVisible(false);
      setRenameProjectId(null);
    }
  };

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.bg }]} behavior="padding" keyboardVerticalOffset={0}>
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: insets.top + 4, paddingHorizontal: padding, paddingBottom: scale(8), borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}>
        <TouchableOpacity onPress={() => openSidebar?.()} style={{ width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: font(20), color: colors.ink }}>☰</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: font(18), color: colors.ink, fontWeight: '700' }}>Projects</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <ProfileAvatar size={scale(36)} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: padding, marginTop: scale(12), padding: scale(4), borderRadius: scale(12), borderWidth: 1, borderColor: colors.border }}>
        {['yours', 'team', 'shared'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: scale(10), borderRadius: scale(10), backgroundColor: projectTab === tab ? colors.primary : 'transparent' }}
            onPress={() => setProjectTab(tab)}
          >
            <Text style={{ fontSize: font(13), fontWeight: '600', color: projectTab === tab ? '#fff' : colors.ink, textAlign: 'center' }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: padding, paddingTop: scale(40), paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {filtered.length === 0 ? (
          <>
            <View style={{ width: scale(80), height: scale(80), alignItems: 'center', justifyContent: 'center', marginBottom: scale(20) }}>
              <Text style={{ fontSize: 48 }}>{projects.length === 0 ? '📁' : '🔍'}</Text>
            </View>
            <Text style={{ fontSize: font(15), color: colors.ink, textAlign: 'center', lineHeight: font(22), maxWidth: 280 }}>
              {projects.length === 0
                ? 'Create a project to organize questions and solutions around a topic or subject.'
                : 'No projects match your search.'}
            </Text>
          </>
        ) : (
          <View style={{ width: '100%', paddingTop: scale(16) }}>
            {filtered.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: p.id })}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: scale(14), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontSize: font(15), color: colors.ink, fontWeight: '600', flex: 1 }} numberOfLines={1}>{p.name}</Text>
                <TouchableOpacity onPress={(e) => openRename(p, e)} style={{ padding: scale(8), marginRight: scale(4) }} hitSlop={8}>
                  <Text style={{ fontSize: font(16), color: colors.muted }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Delete project', `Remove "${p.name}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeProject(p.id) }])} style={{ padding: scale(8) }} hitSlop={8}>
                  <Text style={{ fontSize: font(16), color: colors.muted }}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          paddingBottom: insets.bottom,
          paddingHorizontal: padding,
          paddingTop: scale(4),
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: scale(22), borderWidth: 1, borderColor: colors.border, minHeight: scale(44), paddingLeft: scale(48), paddingRight: scale(8), paddingVertical: scale(8) }}>
            <View
              style={{
                position: 'absolute',
                left: scale(6),
                bottom: scale(6),
                width: scale(32),
                height: scale(32),
                borderRadius: scale(16),
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.borderAccent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: font(16), color: colors.primary }}>🔍</Text>
            </View>
            <TextInput
              placeholder="Search projects…"
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, fontSize: font(15), color: colors.ink, paddingVertical: 0 }}
            />
          </View>
          <TouchableOpacity onPress={onAddProject} style={{ marginLeft: scale(8), width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: font(22), color: '#fff', fontWeight: '300' }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={renameModalVisible} transparent animationType="fade">
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: scale(24) }]} onPress={() => setRenameModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderRadius: scale(16), padding: scale(20), borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: font(16), color: colors.ink, fontWeight: '600', marginBottom: scale(12) }}>Rename project</Text>
            <TextInput
              placeholder="Project name"
              placeholderTextColor={colors.placeholder}
              value={renameDraft}
              onChangeText={setRenameDraft}
              autoFocus
              style={{ backgroundColor: colors.bg, borderRadius: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: font(15), color: colors.ink, borderWidth: 1, borderColor: colors.border }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: scale(16), gap: scale(8) }}>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)} style={{ paddingVertical: scale(10), paddingHorizontal: scale(16) }}>
                <Text style={{ fontSize: font(15), color: colors.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRename} style={{ paddingVertical: scale(10), paddingHorizontal: scale(16), backgroundColor: colors.primary, borderRadius: scale(10) }}>
                <Text style={{ fontSize: font(15), color: '#fff', fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={createModalVisible} transparent animationType="fade">
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: scale(24) }]} onPress={() => setCreateModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderRadius: scale(16), padding: scale(20), borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: font(16), color: colors.ink, fontWeight: '600', marginBottom: scale(12) }}>New project</Text>
            <TextInput
              placeholder="Project name"
              placeholderTextColor={colors.placeholder}
              value={createDraft}
              onChangeText={setCreateDraft}
              autoFocus
              style={{ backgroundColor: colors.bg, borderRadius: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: font(15), color: colors.ink, borderWidth: 1, borderColor: colors.border }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: scale(16), gap: scale(8) }}>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={{ paddingVertical: scale(10), paddingHorizontal: scale(16) }}>
                <Text style={{ fontSize: font(15), color: colors.muted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSubmitCreate} style={{ paddingVertical: scale(10), paddingHorizontal: scale(16), backgroundColor: colors.primary, borderRadius: scale(10) }}>
                <Text style={{ fontSize: font(15), color: '#fff', fontWeight: '600' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
}

function SavedScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { insets, padding, scale, font } = useLayout();
  const savedSolutions = useStudlyStoreImpl((s) => s.savedSolutions);
  const removeSaved = useStudlyStoreImpl((s) => s.removeSaved);
  const chats = useStudlyStoreImpl((s) => s.chats);
  const setActiveChatId = useStudlyStoreImpl((s) => s.setActiveChatId);
  const removeChat = useStudlyStoreImpl((s) => s.removeChat);
  const starredChatIds = useStudlyStoreImpl((s) => s.starredChatIds);
  const toggleChatStarred = useStudlyStoreImpl((s) => s.toggleChatStarred);

  useFocusEffect(useCallback(() => {
    useStudlyStoreImpl.getState().setLastNonAskTab('Saved');
  }, []));

  const sortedChats = [...chats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const starredChats = sortedChats.filter((c) => starredChatIds.includes(c.id));

  const onUnsave = (id, title) => {
    Alert.alert('Unsave solution', `Unsave "${title.slice(0, 40)}${title.length > 40 ? '…' : ''}" from your saved list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unsave', style: 'destructive', onPress: () => removeSaved(id) },
    ]);
  };

  const onOpenChat = (chat) => {
    setActiveChatId(chat.id);
    navigation.navigate('Chat');
  };

  const onRemoveChat = (chat) => {
    Alert.alert('Delete chat', `Remove "${(chat.title || 'Chat').slice(0, 40)}…"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeChat(chat.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: scale(12),
          paddingHorizontal: padding,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.7}
          style={{
            width: scale(40),
            height: scale(40),
            borderRadius: scale(20),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ fontSize: font(22), color: colors.primary, fontWeight: '600' }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: font(18), color: colors.ink, fontWeight: '700', marginLeft: scale(12) }}>Saved</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: scale(16), paddingHorizontal: padding, paddingBottom: 80 + insets.bottom }}
      >
        <Text style={[styles.sectionTitle, { fontSize: font(11), marginBottom: scale(12), color: colors.dark }]}>STARRED</Text>
        {starredChats.length === 0 ? (
          <View style={[styles.emptyCard, { borderRadius: scale(14), padding: scale(24), borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: colors.card, marginBottom: scale(24) }]}>
            <Text style={[styles.emptyTitle, { fontSize: font(15), color: colors.ink }]}>No starred chats.</Text>
            <Text style={[styles.emptySub, { fontSize: font(13), marginTop: scale(6), color: colors.primary }]}>Tap ★ in a chat header to star it.</Text>
          </View>
        ) : (
          starredChats.map((chat) => (
            <View key={chat.id} style={[styles.savedCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: scale(14), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: colors.border }]}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => onOpenChat(chat)} style={{ flex: 1 }}>
                <Text style={[styles.recentTitle, { fontSize: font(14), color: colors.ink }]} numberOfLines={2}>★ {chat.title || 'Chat'}</Text>
                <Text style={[styles.recentSub, { fontSize: font(12), marginTop: 4, color: colors.primary }]}>{chat.messages?.length || 0} messages</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleChatStarred(chat.id)} style={{ padding: scale(8) }}>
                <Text style={{ fontSize: font(18), color: '#f1c40f' }}>★</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onRemoveChat(chat)} style={{ padding: scale(8) }}>
                <Text style={{ fontSize: font(14), color: colors.muted }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { fontSize: font(11), marginBottom: scale(12), marginTop: scale(8), color: colors.dark }]}>CHATS</Text>
        {sortedChats.length === 0 ? (
          <View style={[styles.emptyCard, { borderRadius: scale(14), padding: scale(24), borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: colors.card, marginBottom: scale(24) }]}>
            <Text style={[styles.emptyTitle, { fontSize: font(15), color: colors.ink }]}>No chats yet.</Text>
            <Text style={[styles.emptySub, { fontSize: font(13), marginTop: scale(6), color: colors.primary }]}>Start asking questions in Chat — they’ll be saved here.</Text>
          </View>
        ) : (
          sortedChats.map((chat) => (
            <View key={chat.id} style={[styles.savedCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: scale(14), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: colors.border }]}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => onOpenChat(chat)} style={{ flex: 1 }}>
                <Text style={[styles.recentTitle, { fontSize: font(14), color: colors.ink }]} numberOfLines={2}>{chat.title || 'Chat'}</Text>
                <Text style={[styles.recentSub, { fontSize: font(12), marginTop: 4, color: colors.primary }]}>{chat.messages?.length || 0} messages</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleChatStarred(chat.id)} style={{ padding: scale(8) }}>
                <Text style={{ fontSize: font(18), color: starredChatIds.includes(chat.id) ? '#f1c40f' : colors.muted }}>{starredChatIds.includes(chat.id) ? '★' : '☆'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onRemoveChat(chat)} style={{ padding: scale(8) }}>
                <Text style={{ fontSize: font(14), color: colors.muted }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { fontSize: font(11), marginBottom: scale(12), marginTop: scale(8), color: colors.dark }]}>SAVED SOLUTIONS</Text>
        {savedSolutions.length === 0 ? (
          <View style={[styles.emptyCard, { borderRadius: scale(14), padding: scale(24), borderWidth: 1, borderColor: colors.borderAccent, backgroundColor: colors.card }]}>
            <Text style={[styles.emptyTitle, { fontSize: font(15), color: colors.ink }]}>No saved solutions yet.</Text>
            <Text style={[styles.emptySub, { fontSize: font(13), marginTop: scale(6), color: colors.primary }]}>Tap "Save this answer" in a chat to keep it here.</Text>
          </View>
        ) : (
          savedSolutions.map((item) => (
            <View key={item.id} style={[styles.savedCard, { backgroundColor: colors.card, borderRadius: scale(14), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recentTitle, { fontSize: font(14), color: colors.ink }]} numberOfLines={2}>{item.question}</Text>
                  <Text style={[styles.recentSub, { fontSize: font(12), marginTop: 4, color: colors.primary }]}>{item.subject}</Text>
                </View>
                <TouchableOpacity onPress={() => onUnsave(item.id, item.question)} style={{ padding: scale(8) }}>
                  <Text style={{ fontSize: font(14), color: colors.primary, fontWeight: '600' }}>Unsave</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function SettingsSectionHeader({ title }) {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  return (
    <Text style={{ fontSize: font(12), fontWeight: '700', color: colors.muted, letterSpacing: 0.8, marginBottom: scale(8), marginTop: scale(8), paddingHorizontal: scale(4) }}>{title}</Text>
  );
}

function SettingsGroup({ children }) {
  const { colors } = useTheme();
  const { scale } = useLayout();
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: scale(14), borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: scale(20) }}>
      {React.Children.map(children, (child, i) => (
        <View key={i}>
          {i > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: scale(52) }} />}
          {child}
        </View>
      ))}
    </View>
  );
}

function SettingsRow({ icon, label, right, onPress, destructive }) {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: scale(14), paddingHorizontal: scale(16) }}
    >
      <Text style={{ fontSize: font(20), width: scale(28) }}>{icon}</Text>
      <Text style={{ flex: 1, fontSize: font(15), color: destructive ? '#e74c3c' : colors.ink, fontWeight: '500', marginLeft: scale(8) }}>{label}</Text>
      {right}
      {onPress && !right && <Text style={{ fontSize: font(16), color: colors.muted }}>›</Text>}
    </TouchableOpacity>
  );
}

function ProfileScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { insets, padding, scale, font } = useLayout();
  const clerk = useClerk();
  const userName = useStudlyStoreImpl((s) => s.userName);
  const setUserName = useStudlyStoreImpl((s) => s.setUserName);
  const profileImage = useStudlyStoreImpl((s) => s.profileImage);
  const setProfileImage = useStudlyStoreImpl((s) => s.setProfileImage);
  const appearance = useStudlyStoreImpl((s) => s.appearance);
  const setAppearance = useStudlyStoreImpl((s) => s.setAppearance);
  const defaultOutput = useStudlyStoreImpl((s) => s.defaultOutput);
  const setDefaultOutput = useStudlyStoreImpl((s) => s.setDefaultOutput);
  const notificationsEnabled = useStudlyStoreImpl((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useStudlyStoreImpl((s) => s.setNotificationsEnabled);
  const _recentQuestions = useStudlyStoreImpl((s) => s.recentQuestions);
  const recentQuestions = useMemo(() => { const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; return _recentQuestions.filter((r) => r.createdAt >= cutoff); }, [_recentQuestions]);
  const savedSolutions = useStudlyStoreImpl((s) => s.savedSolutions);
  const subscriptionPlan = useStudlyStoreImpl((s) => s.subscriptionPlan);
  const setSubscriptionPlan = useStudlyStoreImpl((s) => s.setSubscriptionPlan);

  const { getToken } = useAuth();
  const openStudlyProCheckout = useCallback(async (plan) => {
    try {
      const token = await getToken();
      const data = await createCheckoutSession(plan, token);
      if (data?.url) await WebBrowser.openBrowserAsync(data.url);
      else Alert.alert('Error', 'Could not open checkout.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not start checkout.');
    }
  }, [getToken]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const profile = await getProfile(token);
        if (cancelled) return;
        if (profile?.subscription_plan === 'yearly' || profile?.subscription_plan === 'monthly') {
          setSubscriptionPlan(profile.subscription_plan);
        } else {
          setSubscriptionPlan('free');
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [getToken, setSubscriptionPlan]));

  const showPlanPicker = () => {
    Alert.alert(
      'Plan',
      PLAN_PICKER_MESSAGE,
      [
        { text: PLAN_LABELS.free, onPress: () => setSubscriptionPlan('free') },
        { text: PLAN_LABELS.monthly, onPress: () => openStudlyProCheckout('monthly') },
        { text: PLAN_LABELS.yearly + ' (save more)', onPress: () => openStudlyProCheckout('yearly') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const [darkModeSwitch, setDarkModeSwitch] = useState(() => isDark);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);

  useEffect(() => { setDarkModeSwitch(isDark); }, [isDark]);
  useEffect(() => { setNameDraft(userName); }, [userName]);

  const setDarkModeEnabled = useCallback((value) => {
    setDarkModeSwitch(value);
    setTimeout(() => setAppearance(value ? 'dark' : 'light'), 320);
  }, [setAppearance]);

  const pickProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets?.[0]) setProfileImage(res.assets[0].uri);
    } catch (e) { Alert.alert('Error', 'Could not open photo library.'); }
  };

  const saveName = () => { setUserName(nameDraft); setEditingName(false); };

  const displayName = userName.trim() || '';
  const initial = displayName ? displayName.slice(0, 1).toUpperCase() : '👤';

  const defaultOutputLabel = { ask: 'Ask each time', handwritten: 'Handwritten', flowchart: 'Flowchart' };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: scale(12), paddingHorizontal: padding, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => navigation.navigate(useStudlyStoreImpl.getState().lastNonAskTab || 'Chat')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ fontSize: font(16), color: colors.primary, fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: font(18), color: colors.ink, fontWeight: '700' }}>Settings</Text>
        <View style={{ width: scale(50) }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: padding, paddingBottom: 80 + insets.bottom }}>

        {/* Profile card */}
        <View style={{ alignItems: 'center', paddingVertical: scale(28) }}>
          <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.8}>
            {profileImage ? (
              <View style={{ width: scale(88), height: scale(88), borderRadius: scale(44), overflow: 'hidden', borderWidth: 3, borderColor: colors.primary }}>
                <View style={{ width: '100%', height: '100%', backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: font(10), color: colors.muted }}>Loading...</Text>
                </View>
                <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%', position: 'absolute' }} />
              </View>
            ) : (
              <View style={{ width: scale(88), height: scale(88), borderRadius: scale(44), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.primary + '40' }}>
                <Text style={{ fontSize: font(36), color: '#fff', fontWeight: '700' }}>{initial}</Text>
              </View>
            )}
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: font(14) }}>📷</Text>
            </View>
          </TouchableOpacity>

          {editingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(14), gap: scale(8) }}>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                autoFocus
                style={{ fontSize: font(20), fontWeight: '700', color: colors.ink, borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: scale(4), minWidth: 120, textAlign: 'center' }}
                onSubmitEditing={saveName}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={saveName}><Text style={{ fontSize: font(14), color: colors.primary, fontWeight: '600' }}>Save</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)} style={{ marginTop: scale(14) }}>
              <Text style={{ fontSize: font(20), color: colors.ink, fontWeight: '700' }}>{displayName}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setEditingName(true)} style={{ marginTop: scale(6), paddingVertical: scale(6), paddingHorizontal: scale(16), borderRadius: scale(8), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
            <Text style={{ fontSize: font(13), color: colors.muted, fontWeight: '500' }}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account section */}
        <SettingsSectionHeader title="ACCOUNT" />
        <SettingsGroup>
          <SettingsRow icon="✉️" label="Email" right={<ProfileAccountEmail />} />
          <SettingsRow icon="💳" label="Plan" right={<Text style={{ fontSize: font(14), color: colors.ink, fontWeight: '600' }}>{getPlanLabelShort(subscriptionPlan)}</Text>} />
          <SettingsRow icon="🔄" label="Change plan" onPress={showPlanPicker} />
        </SettingsGroup>

        {/* AI Output section */}
        <SettingsSectionHeader title="AI OUTPUT" />
        <SettingsGroup>
          {(['ask', 'handwritten', 'flowchart']).map((key) => (
            <SettingsRow
              key={key}
              icon={key === 'ask' ? '🤖' : key === 'handwritten' ? '✏️' : '📊'}
              label={defaultOutputLabel[key]}
              onPress={() => setDefaultOutput(key)}
              right={defaultOutput === key ? <Text style={{ fontSize: font(18), color: colors.primary }}>✓</Text> : null}
            />
          ))}
        </SettingsGroup>

        {/* App section */}
        <SettingsSectionHeader title="APP" />
        <SettingsGroup>
          <SettingsRow icon="🌙" label="Dark mode" right={<Switch value={darkModeSwitch} onValueChange={setDarkModeEnabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />} />
          <SettingsRow icon="🔔" label="Notifications" right={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />} />
        </SettingsGroup>

        {/* Activity section */}
        <SettingsSectionHeader title="ACTIVITY" />
        <SettingsGroup>
          <SettingsRow icon="💬" label="Recent questions" right={<Text style={{ fontSize: font(14), color: colors.muted }}>{recentQuestions.length}</Text>} />
          <SettingsRow icon="💾" label="Saved solutions" right={<Text style={{ fontSize: font(14), color: colors.muted }}>{savedSolutions.length}</Text>} />
        </SettingsGroup>

        {/* About section */}
        <SettingsSectionHeader title="ABOUT" />
        <SettingsGroup>
          <SettingsRow icon="ℹ️" label="Help Center" onPress={() => Alert.alert('Help', 'Visit studly.app/help for support.')} />
          <SettingsRow icon="📜" label="Terms of Use" onPress={() => Alert.alert('Terms', 'Visit studly.app/terms.')} />
          <SettingsRow icon="🔒" label="Privacy Policy" onPress={() => Alert.alert('Privacy', 'Visit studly.app/privacy.')} />
          <SettingsRow icon="📱" label="Studly for iOS" right={<Text style={{ fontSize: font(12), color: colors.muted }}>v1.0.0</Text>} />
        </SettingsGroup>

        {/* Log out */}
        <SettingsGroup>
          <ProfileLogoutRow />
        </SettingsGroup>

      </ScrollView>
    </View>
  );
}

function ProfileAccountEmail() {
  const { colors } = useTheme();
  const { font } = useLayout();
  try {
    const { useUser } = require('@clerk/clerk-expo');
    const { user } = useUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? '';
    return <Text style={{ fontSize: font(14), color: colors.muted }} numberOfLines={1}>{email || 'Not set'}</Text>;
  } catch { return null; }
}

function ProfileLogoutRow() {
  const { colors } = useTheme();
  const { scale, font } = useLayout();
  const { useClerk } = require('@clerk/clerk-expo');
  const { signOut } = useClerk();
  return (
    <TouchableOpacity
      onPress={() => Alert.alert('Sign out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => signOut() }])}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: scale(14), paddingHorizontal: scale(16) }}
    >
      <Text style={{ fontSize: font(20), width: scale(28) }}>🚪</Text>
      <Text style={{ flex: 1, fontSize: font(15), color: '#e74c3c', fontWeight: '500', marginLeft: scale(8) }}>Log out</Text>
    </TouchableOpacity>
  );
}

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="AuthLanding"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="AuthLanding" component={AuthLandingScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Chat"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Chat" component={AskScreen} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <Stack.Screen name="Saved" component={SavedScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const tutorialSeen = useStudlyStoreImpl((s) => s.tutorialSeen);
  const setTutorialSeen = useStudlyStoreImpl((s) => s.setTutorialSeen);

  if (!isLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4BAED0" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <AuthStack />;
  }

  return (
    <>
      <ClerkUserSync />
      <SubscriptionDeepLinkHandler />
      <SidebarProvider>
        <TabNavigator />
      </SidebarProvider>
      {!tutorialSeen && <FeatureShowcase onDone={() => setTutorialSeen(true)} />}
    </>
  );
}

const styles = StyleSheet.create({
  errorBoundaryContainer: { flex: 1 },
  errorBanner: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#ff6b6b', marginBottom: 4 },
  errorMessage: { fontSize: 12, color: '#e0e0e0', marginBottom: 10 },
  errorDismiss: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#333', borderRadius: 8 },
  errorDismissText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  container: { flex: 1, width: '100%' },
  scrollContent: { flexGrow: 1, width: '100%' },
  header: { width: '100%' },
  headerInner: {},
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  logoText: { color: '#fff', fontFamily: 'Georgia', fontWeight: '700' },
  appName: { color: '#fff', fontFamily: 'Georgia', fontWeight: '700' },
  avatar: { backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff' },
  greeting: { color: '#fff', fontFamily: 'Georgia', fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.8)' },
  pasteButton: { flexDirection: 'row', alignItems: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 6 },
  pastePlaceholder: {},
  section: {},
  sectionTitle: { fontWeight: '700', letterSpacing: 1 },
  cardsRow: { flexDirection: 'row' },
  card: {},
  howItWorksCard: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  cardLabel: { fontWeight: '700' },
  emptyCard: {},
  emptyTitle: { fontWeight: '600' },
  emptySub: {},
  recentCard: { flexDirection: 'row', alignItems: 'center' },
  recentIcon: { alignItems: 'center', justifyContent: 'center' },
  recentText: { flex: 1 },
  recentTitle: { fontWeight: '700' },
  recentSub: {},
  chevron: {},
  askInput: { textAlignVertical: 'top', borderWidth: 1 },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap' },
  subjectChip: { borderWidth: 1 },
  solveButton: { alignItems: 'center' },
  saveSolutionBtn: { alignItems: 'center' },
  newQuestionBtn: { alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTabs: {},
  savedCard: {},
  askHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  backButton: {},
  attachButton: {},
  attachRow: {},
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  addToChatCard: { width: '100%', maxWidth: 400 },
  addToChatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addToChatTitle: { fontWeight: '700' },
  addToChatOption: {},
  addToChatRow: {},
  sidebarContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarOverlay: {
    flex: 1,
    zIndex: 1,
  },
  sidebarPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'column',
    backgroundColor: SIDEBAR_DARK.bg,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  sidebarHeader: {
    marginBottom: 16,
  },
  sidebarTitle: {
    fontFamily: 'Georgia',
    fontWeight: '700',
    fontSize: 24,
    color: SIDEBAR_DARK.text,
  },
  sidebarTagline: {
    fontSize: 11,
    color: SIDEBAR_DARK.muted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sidebarNavRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sidebarNavItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  sidebarNavItemActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sidebarNavIcon: {
    fontSize: 16,
  },
  sidebarNavLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SIDEBAR_DARK.text,
  },
  sidebarNavLabelActive: {
    color: SIDEBAR_DARK.text,
  },
  sidebarSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sidebarSectionHeaderSpaced: {
    marginTop: 16,
  },
  sidebarSectionIcon: {
    fontSize: 12,
  },
  sidebarSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: SIDEBAR_DARK.muted,
    letterSpacing: 0.8,
  },
  sidebarEmptyWrap: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  sidebarEmptyIcon: {
    fontSize: 18,
    marginBottom: 6,
    opacity: 0.7,
  },
  sidebarEmpty: {
    fontSize: 12,
    color: SIDEBAR_DARK.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  sidebarItem: {
    paddingVertical: 10,
    paddingRight: 8,
    paddingLeft: 4,
    borderBottomWidth: 1,
    borderBottomColor: SIDEBAR_DARK.border,
  },
  sidebarItemText: {
    fontSize: 13,
    color: SIDEBAR_DARK.text,
    fontWeight: '500',
  },
  sidebarItemMeta: {
    fontSize: 11,
    color: SIDEBAR_DARK.muted,
    marginTop: 2,
  },
  sidebarAllChats: {
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  sidebarAllChatsText: {
    fontSize: 13,
    color: SIDEBAR_DARK.primary,
    fontWeight: '600',
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: SIDEBAR_DARK.border,
  },
  sidebarUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sidebarAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SIDEBAR_DARK.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarAvatarText: {
    fontSize: 12,
    color: SIDEBAR_DARK.text,
    fontWeight: '600',
  },
  sidebarUserName: {
    fontSize: 13,
    color: SIDEBAR_DARK.text,
    fontWeight: '600',
  },
  sidebarNewBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarNewBtnText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '300',
  },
});

function AppContent() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ErrorBoundary>
        <ClerkProvider
          publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? Constants.expoConfig?.extra?.clerkPublishableKey}
          tokenCache={tokenCache}
          appearance={{
            layout: {
              showFooter: false,
            },
            elements: {
              footer: { display: 'none' },
              footerAction: { display: 'none' },
              'userProfile-footer': { display: 'none' },
              'organizationSwitcher-footer': { display: 'none' },
            },
          }}
        >
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </ClerkProvider>
      </ErrorBoundary>
    </>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {splashDone ? (
          <AppContent />
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <StatusBar style="light" />
            <SplashScreen onDone={() => setSplashDone(true)} />
          </View>
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
