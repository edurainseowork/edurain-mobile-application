import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
  Easing,
  RefreshControl,
  AppState,
} from 'react-native';
import { showPermissionAlert } from '../services/permissionAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { io } from 'socket.io-client';
import { onValue, ref } from 'firebase/database';
import { rtdb } from '../firebaseConfig';
import { useApp } from '../context/AppContext';
import { Theme } from '../constants/theme';
import { LockedFeatureGuard } from '../components/LockedFeatureGuard';
import { API_BASE_URL, SOCKET_URL } from '../api/client';
import { DoubtTicketCardSkeleton } from '../components/Shared/Skeleton';
import {
  fetchStudentDoubtTickets,
  fetchSingleDoubtTicket,
  fetchTicketUpdates,
  submitDoubtTicket,
  sendTicketReply,
  sendResolutionAction,
  DoubtTicket,
  ChatMessage,
} from '../api/doubts';

const CATEGORIES = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'IIT-JEE Advanced',
  'NEET-UG',
  'General Doubt',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

const LOCAL_TICKETS_KEY = 'edurain_student_local_tickets_v1';

async function getStoredLocalTickets(): Promise<DoubtTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveStoredLocalTickets(tickets: DoubtTicket[]) {
  try {
    await AsyncStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(tickets.slice(0, 50)));
  } catch {}
}

// Same limits as the website and the server: 1 photo when raising a doubt, 2 more in the chat, each under 1 MB
const MAX_PHOTO_BYTES = 1024 * 1024;
const MAX_CHAT_PHOTOS = 2;

/** Photos the student has sent in the chat (the first message is the doubt itself and doesn't count). */
const chatPhotosSent = (t: DoubtTicket | null) =>
  (t?.messages || [])
    .slice(1)
    .filter((m) => m.sender === 'student')
    .reduce((sum, m) => sum + (m.attachmentUrls?.length || (m.attachmentUrl ? 1 : 0)), 0);

/**
 * Phone photos are 3–10 MB. Shrink the long side and lower the JPEG quality step by step until the photo is
 * under 1 MB, and return it as a data URL. null if even the smallest step is too big.
 */
async function compressPhoto(uri: string, width: number, height: number): Promise<string | null> {
  const steps: [number, number][] = [
    [1600, 0.7],
    [1280, 0.6],
    [1024, 0.5],
    [800, 0.4],
  ];
  for (const [side, quality] of steps) {
    const context = ImageManipulator.manipulate(uri);
    if (Math.max(width, height) > side) context.resize(width >= height ? { width: side } : { height: side });
    const image = await context.renderAsync();
    try {
      const { base64 } = await image.saveAsync({ base64: true, compress: quality, format: SaveFormat.JPEG });
      if (base64 && base64.length * 0.75 <= MAX_PHOTO_BYTES) return `data:image/jpeg;base64,${base64}`;
    } finally {
      image.release();
      context.release();
    }
  }
  return null;
}

function mergeTicketLists(server: DoubtTicket[], local: DoubtTicket[]): DoubtTicket[] {
  const map = new Map<string, DoubtTicket>();
  for (const t of local) {
    // Made-up copies older app versions saved when the server's reply was misread; the real ticket comes from the server
    if (!t || t.ticketNumber === 'TKT-QUEUE') continue;
    if (t.id) map.set(t.id, t);
    if (t.ticketNumber) map.set(t.ticketNumber, t);
  }
  for (const t of server) {
    if (!t) continue;
    const existing = map.get(t.id) || (t.ticketNumber ? map.get(t.ticketNumber) : null);
    if (existing) {
      const existingMsgs = existing.messages || [];
      const serverMsgs = t.messages || [];
      const mergedMsgs = [...serverMsgs];
      for (const em of existingMsgs) {
        if (!mergedMsgs.some((m) => m.id === em.id || (m.text === em.text && m.sender === em.sender))) {
          mergedMsgs.push(em);
        }
      }
      const updated = {
        ...existing,
        ...t,
        messages: mergedMsgs,
      };
      map.set(t.id, updated);
      if (t.ticketNumber) map.set(t.ticketNumber, updated);
    } else {
      map.set(t.id, t);
      if (t.ticketNumber) map.set(t.ticketNumber, t);
    }
  }
  const seen = new Set<string>();
  const res: DoubtTicket[] = [];
  for (const t of map.values()) {
    if (!seen.has(t.id)) {
      seen.add(t.id);
      res.push(t);
    }
  }
  res.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
  return res;
}

export default function AskYourDoubtScreen() {
  const insets = useSafeAreaInsets();
  const { user, goal } = useApp();

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('Mathematics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tickets List State
  const [tickets, setTickets] = useState<DoubtTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsModalVisible, setTicketsModalVisible] = useState(false);

  // Active Chat State (Screenshot 1 & 2)
  const [selectedTicket, setSelectedTicket] = useState<DoubtTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<{ uri: string; base64?: string } | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [resolvingAction, setResolvingAction] = useState(false);
  const [refreshingChat, setRefreshingChat] = useState(false);
  const [isFacultyTyping, setIsFacultyTyping] = useState(false);
  const studentTypingTimerRef = useRef<any>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Zoom Image Modal
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const socketRef = useRef<any>(null);
  const chatScrollRef = useRef<any>(null);

  const cohortName = goal?.name?.toUpperCase() || 'NEET';

  // 1. Initial Tickets Loading (Persistent & Merged with Local Storage)
  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const local = await getStoredLocalTickets();
      if (local.length > 0) {
        setTickets((prev) => mergeTicketLists(prev, local));
      }
      const knownIds = local.map((t) => t.id).join(',');
      const list = await fetchStudentDoubtTickets(user?.email || undefined, user?.phone || undefined, knownIds);
      const merged = mergeTicketLists(list, local);
      setTickets(merged);
      saveStoredLocalTickets(merged);

      // Sync selected ticket if open
      if (selectedTicket) {
        const updated = merged.find((t) => t.id === selectedTicket.id || t.ticketNumber === selectedTicket.ticketNumber);
        if (updated) {
          setSelectedTicket(updated);
        }
      }
    } finally {
      setLoadingTickets(false);
    }
  }, [user?.email, user?.phone, selectedTicket?.id]);

  useEffect(() => {
    loadTickets();
  }, [user?.email, user?.phone]);

  // Chat Refresh Action (Triggered via header refresh button or pull-to-refresh)
  const handleChatRefresh = async (triggerHaptic: boolean = true) => {
    if (!selectedTicket?.id || refreshingChat) return;
    setRefreshingChat(true);

    if (triggerHaptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      spinAnim.setValue(0);
    });

    try {
      const fresh = await fetchSingleDoubtTicket(selectedTicket.id);
      if (fresh) {
        setSelectedTicket((prev) => {
          if (!prev) return fresh;
          const prevMsgs = prev.messages || [];
          const freshMsgs = fresh.messages || [];
          const merged = [...freshMsgs];
          for (const pm of prevMsgs) {
            if (!merged.some((m) => m.id === pm.id || (m.text === pm.text && m.sender === pm.sender))) {
              merged.push(pm);
            }
          }
          return {
            ...prev,
            ...fresh,
            messages: merged,
          };
        });

        setTickets((prev) => {
          const next = prev.map((t) => (t.id === fresh.id || t.ticketNumber === fresh.ticketNumber ? { ...t, ...fresh } : t));
          saveStoredLocalTickets(next);
          return next;
        });
      }
    } finally {
      setRefreshingChat(false);
    }
  };

  // 2. Real-Time Socket.io Connection & Redis Synchronization
  useEffect(() => {
    // API Gateway + Lambda has no WebSocket server: connecting there only retries forever. Polling below keeps the chat live.
    if (/amazonaws\.com/.test(SOCKET_URL)) return;
    let socket: any = null;
    try {
      socket = (io as any)(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      } as any);
      socketRef.current = socket;

      socket.on('connect', () => {
        if (selectedTicket) {
          socket?.emit('join_ticket', {
            ticketId: selectedTicket.id,
            userId: user?.email || 'student@edurain.in',
            role: 'student',
          });
        }
      });

      socket.on('typing', (payload: { ticketId: string; sender: string; isTyping: boolean }) => {
        if (!payload) return;
        setSelectedTicket((curr) => {
          if (!curr) return null;
          if (curr.id === payload.ticketId || curr.ticketNumber === payload.ticketId) {
            if (payload.sender === 'ta') {
              setIsFacultyTyping(payload.isTyping);
              if (payload.isTyping) {
                setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);
              }
            }
          }
          return curr;
        });
      });

      socket.on('new_message', (payload: { ticketId: string; ticketNumber?: string; message: ChatMessage; ticket?: any }) => {
        if (!payload?.message) return;
        const msg = payload.message;

        setSelectedTicket((curr) => {
          if (!curr) return null;
          if (
            curr.id === payload.ticketId ||
            curr.ticketNumber === payload.ticketId ||
            (payload.ticketNumber && curr.ticketNumber === payload.ticketNumber)
          ) {
            const msgs = curr.messages || [];
            if (msgs.some((m) => m.id === msg.id)) return curr;
            return {
              ...curr,
              messages: [...msgs, msg],
              status: payload.ticket?.status || curr.status,
            };
          }
          return curr;
        });

        setTickets((prev) =>
          prev.map((t) => {
            if (
              t.id === payload.ticketId ||
              t.ticketNumber === payload.ticketId ||
              (payload.ticketNumber && t.ticketNumber === payload.ticketNumber)
            ) {
              const msgs = t.messages || [];
              if (msgs.some((m) => m.id === msg.id)) return t;
              return { ...t, messages: [...msgs, msg] };
            }
            return t;
          })
        );

        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      });

      socket.on('resolution_requested', (payload: { ticketId: string; ticketNumber?: string; ticket?: any }) => {
        if (!payload) return;
        setSelectedTicket((curr) => {
          if (!curr) return null;
          if (
            curr.id === payload.ticketId ||
            curr.ticketNumber === payload.ticketId ||
            (payload.ticketNumber && curr.ticketNumber === payload.ticketNumber)
          ) {
            return {
              ...curr,
              status: 'resolution_requested',
              messages: payload.ticket?.messages || curr.messages,
            };
          }
          return curr;
        });
        setTickets((prev) =>
          prev.map((t) =>
            t.id === payload.ticketId ||
            t.ticketNumber === payload.ticketId ||
            (payload.ticketNumber && t.ticketNumber === payload.ticketNumber)
              ? { ...t, status: 'resolution_requested' }
              : t
          )
        );
      });

      socket.on('ticket_closed', (payload: { ticketId: string; ticketNumber?: string }) => {
        if (!payload) return;
        setSelectedTicket((curr) => {
          if (!curr) return null;
          if (
            curr.id === payload.ticketId ||
            curr.ticketNumber === payload.ticketId ||
            (payload.ticketNumber && curr.ticketNumber === payload.ticketNumber)
          ) {
            return { ...curr, status: 'resolved' };
          }
          return curr;
        });
        setTickets((prev) =>
          prev.map((t) =>
            t.id === payload.ticketId ||
            t.ticketNumber === payload.ticketId ||
            (payload.ticketNumber && t.ticketNumber === payload.ticketNumber)
              ? { ...t, status: 'resolved' }
              : t
          )
        );
      });

      socket.on('ticket_status_updated', (payload: { ticketId: string; ticketNumber?: string; status: string }) => {
        if (!payload) return;
        setSelectedTicket((curr) => {
          if (!curr) return null;
          if (curr.id === payload.ticketId || curr.ticketNumber === payload.ticketNumber) {
            return { ...curr, status: payload.status };
          }
          return curr;
        });
        setTickets((prev) =>
          prev.map((t) =>
            t.id === payload.ticketId || t.ticketNumber === payload.ticketNumber
              ? { ...t, status: payload.status }
              : t
          )
        );
      });
    } catch (err) {
      console.warn('[Socket.io] connection error:', err);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user?.email]);

  // Join ticket room when active ticket changes
  useEffect(() => {
    if (selectedTicket && socketRef.current) {
      socketRef.current.emit('join_ticket', {
        ticketId: selectedTicket.id,
        userId: user?.email || 'student@edurain.in',
        role: 'student',
      });
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: false }), 200);
    }
  }, [selectedTicket?.id]);

  // 3. Live chat while a chat is open and the app is in the foreground. The backend pings ticketSignals/<id> in
  // Firebase Realtime Database the moment the ticket is saved (a teacher's reply): read the new messages then.
  // Polling stays as the safety net: every 30 s while that signal works, every 3 s when it doesn't (not set up,
  // or offline). One full read first (the list carries no photos), after that only the new messages.
  useEffect(() => {
    const ticketId = selectedTicket?.id;
    if (!ticketId) return;
    let cancelled = false;
    let busy = false;
    let again = false; // a signal came while reading: read once more after
    let live = false;
    let lastRead = 0;
    let serverCount = -1; // messages the server had at the last read; -1 = full read not done yet
    let known = ''; // "count:status" at the last read

    const apply = (status: string, assignedMentor: string | undefined, incoming: ChatMessage[], full: boolean) => {
      setSelectedTicket((prev) => {
        if (!prev || prev.id !== ticketId) return prev;
        const current = prev.messages || [];
        let messages: ChatMessage[];
        if (full) {
          // The server's list is the truth (with the photos the list view leaves out). Keep only messages sent
          // from this phone that the server hasn't saved yet.
          const saved = new Set(incoming.map((m) => m.id));
          messages = [...incoming, ...current.filter((m) => m.id?.startsWith('m-st-') && !saved.has(m.id))];
        } else {
          const known = new Set(current.map((m) => m.id));
          const added = incoming.filter((m) => !known.has(m.id));
          if (!added.length && status === prev.status) return prev;
          messages = [...current, ...added];
        }
        if (messages.length > current.length) setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
        return { ...prev, status, assignedMentor: assignedMentor || prev.assignedMentor, messages };
      });
    };

    const tick = async (now: boolean = false) => {
      if (cancelled || AppState.currentState !== 'active') return;
      if (busy) {
        again ||= now;
        return;
      }
      if (!now && live && Date.now() - lastRead < 30_000) return;
      busy = true;
      lastRead = Date.now();
      try {
        if (serverCount < 0) {
          const full = await fetchSingleDoubtTicket(ticketId);
          if (full && !cancelled) {
            serverCount = full.messages?.length ?? 0;
            known = `${serverCount}:${full.status}`;
            apply(full.status, full.assignedMentor, full.messages || [], true);
          }
        } else {
          const update = await fetchTicketUpdates(ticketId, serverCount);
          if (update && !cancelled) {
            serverCount = update.messageCount;
            known = `${serverCount}:${update.status}`;
            apply(update.status, update.assignedMentor, update.messages, false);
          }
        }
      } finally {
        busy = false;
        if (again) {
          again = false;
          tick(true);
        }
      }
    };

    tick();
    const pollId = setInterval(() => tick(), 3000);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && tick(true));
    const unsubscribe = rtdb
      ? onValue(
          ref(rtdb, `ticketSignals/${ticketId}`),
          (snap) => {
            live = true;
            const signal = snap.val() as { n?: number; s?: string } | null;
            if (signal && `${signal.n}:${signal.s}` !== known) tick(true);
          },
          () => {
            live = false; // e.g. rules not published yet: keep polling every 3 s
          }
        )
      : () => {};
    return () => {
      cancelled = true;
      clearInterval(pollId);
      sub.remove();
      unsubscribe();
    };
  }, [selectedTicket?.id]);

  // 4. Reliable Camera & Gallery Image Picker (iPhone & Android Tested)
  const pickImage = async (isChatReply: boolean = false) => {
    if (isChatReply && chatPhotosSent(selectedTicket) >= MAX_CHAT_PHOTOS) {
      Alert.alert('Photo Limit Reached', `You can send up to ${MAX_CHAT_PHOTOS} photos in a doubt chat. Please describe it in text.`);
      return;
    }

    // Every photo goes out compressed to under 1 MB
    const usePhoto = async (asset: ImagePicker.ImagePickerAsset) => {
      const base64Data = await compressPhoto(asset.uri, asset.width, asset.height);
      if (!base64Data) {
        Alert.alert('Photo Too Large', 'This photo could not be made smaller than 1 MB. Please try another one or crop it.');
        return;
      }
      if (isChatReply) {
        setReplyImage({ uri: asset.uri, base64: base64Data });
      } else {
        setSelectedImage({ uri: asset.uri, base64: base64Data });
      }
    };

    Alert.alert(
      'Attach Diagram / Screenshot',
      'Choose how you want to upload your doubt:',
      [
        {
          text: '📷 Take Photo (Camera)',
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                showPermissionAlert(
                  'Camera Permission Required',
                  'Allow camera access to photograph your question.'
                );
                return;
              }

              // Important: allowsEditing: false prevents iOS crash/freeze on camera modal dismissal
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                await usePhoto(result.assets[0]);
              }
            } catch (err: any) {
              Alert.alert('Camera Error', 'Could not access camera: ' + (err?.message || 'Try again'));
            }
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) {
                showPermissionAlert(
                  'Photo Library Permission Required',
                  'Allow photo access to choose a screenshot of your question.'
                );
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                await usePhoto(result.assets[0]);
              }
            } catch (err: any) {
              Alert.alert('Gallery Error', 'Could not open gallery: ' + (err?.message || 'Try again'));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // 5. Submit New Ticket
  const handleSubmitTicket = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a doubt topic or concept title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please describe what you have tried & where you are stuck.');
      return;
    }

    setSubmitting(true);
    try {
      const attachments = selectedImage?.base64 ? [selectedImage.base64] : [];
      const res = await submitDoubtTicket({
        subject: selectedCategory,
        title: title.trim(),
        description: description.trim(),
        examTag: cohortName,
        studentName: user?.name || 'Student',
        studentEmail: user?.email || undefined,
        studentPhone: user?.phone || undefined,
        diagramUrl: attachments[0],
        attachments,
      });

      if (res.success) {
        const createdTicket = res.ticket || {};
        const optimisticTicket: DoubtTicket = {
          id: createdTicket.id || `t-${Date.now()}`,
          ticketNumber: createdTicket.ticketNumber || createdTicket.id || 'TKT-QUEUE',
          subject: selectedCategory,
          title: title.trim(),
          description: description.trim(),
          questionFull: description.trim(),
          examTag: cohortName,
          status: 'queue',
          submittedAt: new Date().toISOString(),
          submittedAtRelative: 'Just now',
          assignedMentor: 'EduRain Senior Faculty',
          diagramUrl: attachments[0],
          diagramUrls: attachments,
          messages: [
            {
              id: `m-init-${Date.now()}`,
              sender: 'student',
              senderName: user?.name || 'Student',
              text: description.trim(),
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              attachmentUrl: attachments[0],
            },
          ],
        };

        setTickets((prev) => {
          const updated = [optimisticTicket, ...prev.filter((t) => t.id !== optimisticTicket.id)];
          saveStoredLocalTickets(updated);
          return updated;
        });

        Alert.alert(
          'Doubt Ticket Raised! 🚀',
          'Your ticket is queued for our Teacher Assistant Desk. Average response time is ~14 mins.',
          [
            {
              text: 'View Tickets',
              onPress: () => {
                setTitle('');
                setDescription('');
                setSelectedImage(null);
                setTicketsModalVisible(true);
                loadTickets();
              },
            },
            {
              text: 'Done',
              onPress: () => {
                setTitle('');
                setDescription('');
                setSelectedImage(null);
                loadTickets();
              },
            },
          ]
        );
      } else {
        Alert.alert('Submission Error', res.error || 'Failed to submit doubt. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Typing change handler (debounced emit to socket)
  const handleReplyTextChange = (text: string) => {
    setReplyText(text);
    if (selectedTicket && socketRef.current) {
      socketRef.current.emit('typing', {
        ticketId: selectedTicket.id,
        sender: 'student',
        isTyping: true,
        senderName: user?.name || 'Student',
      });
      if (studentTypingTimerRef.current) clearTimeout(studentTypingTimerRef.current);
      studentTypingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', {
          ticketId: selectedTicket.id,
          sender: 'student',
          isTyping: false,
          senderName: user?.name || 'Student',
        });
      }, 2000);
    }
  };

  // 6. Send Chat Reply (Screenshot 1 & 2)
  const handleSendReply = async () => {
    if (!selectedTicket) return;
    const trimmed = replyText.trim();
    if (!trimmed && !replyImage) return;

    setSendingReply(true);
    const attachments = replyImage?.base64 ? [replyImage.base64] : [];
    // One id for this message everywhere: the server keeps it, so polling replaces this copy instead of adding a second
    const newMsg: ChatMessage = {
      id: `m-st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender: 'student',
      senderName: user?.name || 'Student',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentUrl: attachments[0],
      attachmentUrls: attachments,
    };
    const ticketId = selectedTicket.id;
    const image = replyImage;
    setSelectedTicket((curr) => (curr ? { ...curr, messages: [...(curr.messages || []), newMsg] } : null));
    setReplyText('');
    setReplyImage(null);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Saved over HTTP only: the server also pushes it to any socket clients (no second copy from this phone)
      const res = await sendTicketReply({
        id: newMsg.id,
        ticketId,
        text: trimmed,
        senderName: newMsg.senderName,
        attachmentUrl: attachments[0],
        attachments,
      });

      if (!res.success) {
        // Not saved: take it back out and give the text back, so nothing is lost
        setSelectedTicket((curr) =>
          curr && curr.id === ticketId ? { ...curr, messages: (curr.messages || []).filter((m) => m.id !== newMsg.id) } : curr
        );
        setReplyText(trimmed);
        setReplyImage(image);
        Alert.alert('Could Not Send', res.error || 'Please check your internet and try again.');
      }
    } finally {
      setSendingReply(false);
    }
  };

  // 7. Resolution Action
  const handleResolution = async (action: 'solved' | 'followup') => {
    if (!selectedTicket) return;
    setResolvingAction(true);

    const nextStatus = action === 'solved' ? 'resolved' : 'in_progress';
    setSelectedTicket((curr) => (curr ? { ...curr, status: nextStatus } : null));

    try {
      const res = await sendResolutionAction({
        ticketId: selectedTicket.id,
        action,
      });
      if (res.success) {
        loadTickets();
      } else {
        Alert.alert('Update Failed', res.error || 'Could not update ticket status.');
      }
    } finally {
      setResolvingAction(false);
    }
  };

  // Turn-based check: Has student already sent the last message?
  const isWaitingForFaculty = Boolean(
    selectedTicket?.messages &&
    selectedTicket.messages.length > 0 &&
    selectedTicket.messages[selectedTicket.messages.length - 1].sender === 'student' &&
    selectedTicket.status !== 'resolved' &&
    selectedTicket.status !== 'resolution_requested'
  );

  return (
    <LockedFeatureGuard featureTitle="Ask Your Doubt">
      <View style={styles.mainWrapper}>
        {/* Top Header with Responsive Safe-Area Inset */}
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6,
              paddingBottom: 12,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color="#0B3B42" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Ask a Doubt</Text>

          <TouchableOpacity
            style={styles.myTicketsBtn}
            onPress={() => setTicketsModalVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="ticket-outline" size={16} color="#0B3B42" />
            <Text style={styles.myTicketsBtnText}>My Tickets</Text>
            {tickets.length > 0 && (
              <View style={styles.myTicketsBadge}>
                <Text style={styles.myTicketsBadgeText}>{tickets.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={[
              styles.contentContainer,
              IS_TABLET && styles.tabletContainer,
              { paddingBottom: Math.max(insets.bottom, 24) + 20 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Form Card */}
            <View style={styles.formCard}>
              <View style={styles.subHeaderRow}>
                <View style={styles.sectionPill}>
                  <Text style={styles.sectionPillText}>✨ ASK A DOUBT SECTION</Text>
                </View>
                <View style={styles.cohortPill}>
                  <Text style={styles.cohortPillLabel}>Cohort: </Text>
                  <Text style={styles.cohortPillValue}>{cohortName}</Text>
                </View>
              </View>

              <Text style={styles.mainTitle}>Raise a Ticket</Text>
              <Text style={styles.mainDesc}>
                Have a doubt or question? Submit your query with code, diagrams or screenshots and our subject experts will resolve it.
              </Text>

              {/* Subject Selector */}
              <Text style={styles.inputLabel}>
                Select Subject / Topic Category <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={styles.categoryWrap}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, isSelected && styles.catChipSelected]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      {isSelected && <View style={styles.catDot} />}
                      <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Doubt Topic */}
              <Text style={styles.inputLabel}>
                Doubt Topic / Concept Title <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="write your doubt topic"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              {/* Description */}
              <View style={styles.descLabelRow}>
                <Text style={styles.inputLabel}>
                  Describe What You've Tried & Where You're Stuck <Text style={styles.asterisk}>*</Text>
                </Text>
                <Text style={styles.charCount}>{description.length} / 1000 chars</Text>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Write clear steps, problem question, equation, or describe unexpected behavior..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={(t: string) => setDescription(t.slice(0, 1000))}
                multiline
                textAlignVertical="top"
              />

              {/* Image Attachment */}
              <Text style={styles.inputLabel}>
                Doubt Diagram / Problem Screenshot{' '}
                <Text style={styles.subLabel}>
                  (1 Photo {selectedImage ? '1' : '0'} / 1 image max)
                </Text>
              </Text>

              {selectedImage ? (
                <View style={styles.imagePreviewBox}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setSelectedImage(null)}
                    activeOpacity={0.8}
                  >
                    <Feather name="x" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadDashedBox}
                  onPress={() => pickImage(false)}
                  activeOpacity={0.8}
                >
                  <View style={styles.uploadIconCircle}>
                    <Feather name="upload-cloud" size={24} color="#0B3B42" />
                  </View>
                  <Text style={styles.uploadMainText}>
                    Drop 1 image or <Text style={styles.browseHighlight}>take/choose photo</Text>
                  </Text>
                  <Text style={styles.uploadSubText}>
                    High-clarity upload for fast teacher assistant review
                  </Text>
                </TouchableOpacity>
              )}

              {/* Response Notice */}
              <View style={styles.noticeBox}>
                <Feather name="zap" size={16} color="#0B3B42" style={{ marginRight: 8 }} />
                <Text style={styles.noticeText}>
                  Your query will appear immediately in the Teacher Assistant Desk queue.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitTicket}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Raise a Ticket</Text>
                    <Feather name="send" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer Bar */}
            <View style={styles.footerBar}>
              <View style={styles.footerLeft}>
                <View style={styles.footerLiveDot} />
                <Text style={styles.footerText}>
                  Average TA Response Time: <Text style={styles.footerBold}>~14 mins</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'EduRain TA Desk',
                    'Our teaching assistants and senior faculty review and solve tickets 24/7.'
                  )
                }
              >
                <Text style={styles.footerFaq}>FAQ</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ======================================================== */}
        {/* UNIFIED MODAL: TICKETS LIST & IN-PLACE CHAT */}
        {/* ======================================================== */}
        <Modal
          visible={ticketsModalVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            if (selectedTicket) {
              setSelectedTicket(null);
            } else {
              setTicketsModalVisible(false);
            }
          }}
        >
          {!selectedTicket ? (
          <View
            style={[
              styles.modalScreen,
              {
                paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setTicketsModalVisible(false)}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={20} color="#0B3B42" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>My Doubt Tickets</Text>
              <TouchableOpacity
                style={styles.closeBtnCircle}
                onPress={() => setTicketsModalVisible(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingTickets ? (
              <ScrollView
                contentContainerStyle={[
                  styles.ticketsListScroll,
                  IS_TABLET && styles.tabletContainer,
                ]}
                showsVerticalScrollIndicator={false}
              >
                <DoubtTicketCardSkeleton />
                <DoubtTicketCardSkeleton />
                <DoubtTicketCardSkeleton />
              </ScrollView>
            ) : tickets.length === 0 ? (
              <View style={styles.centerBox}>
                <Feather name="check-circle" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Doubts Raised Yet</Text>
                <Text style={styles.emptySubtitle}>
                  When you raise a doubt ticket, you can chat with assigned educators and view solutions here.
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={[
                  styles.ticketsListScroll,
                  IS_TABLET && styles.tabletContainer,
                ]}
                showsVerticalScrollIndicator={false}
              >
                {tickets.map((t) => {
                  const isResolved = t.status === 'resolved';
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.ticketCard}
                      onPress={() => setSelectedTicket(t)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.ticketCardHeader}>
                        <View style={styles.ticketBadgeRow}>
                          <View style={styles.tktPill}>
                            <Text style={styles.tktPillText}>{t.ticketNumber || t.id}</Text>
                          </View>
                          <Text style={styles.ticketSubject}>{t.subject}</Text>
                        </View>

                        <View
                          style={[
                            styles.ticketStatusPill,
                            isResolved ? styles.statusPillResolved : styles.statusPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.ticketStatusText,
                              isResolved ? styles.statusTextResolved : styles.statusTextActive,
                            ]}
                          >
                            {isResolved ? 'Resolved' : t.status === 'in_progress' ? 'In Review' : 'In Queue'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.ticketTitle} numberOfLines={2}>
                        {t.title}
                      </Text>
                      <Text style={styles.ticketSnippet} numberOfLines={2}>
                        {t.description || t.questionFull}
                      </Text>

                      <View style={styles.ticketCardFooter}>
                        <Text style={styles.ticketMeta}>
                          {t.submittedAtRelative || 'Recently'} • {t.assignedMentor || 'Faculty'}
                        </Text>
                        <View style={styles.openChatPill}>
                          <Text style={styles.openChatText}>Open Chat &rarr;</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : (
          <View
            style={[
                styles.modalScreen,
                {
                  paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              {/* Top Bar matching Screenshot 1 & 2 */}
              <View style={styles.chatTopBar}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setSelectedTicket(null)}
                  activeOpacity={0.7}
                >
                  <Feather name="arrow-left" size={20} color="#0B3B42" />
                </TouchableOpacity>

                <View style={styles.chatTopMiddle}>
                  <View style={styles.chatBadgeRow}>
                    <View style={styles.chatTktBadge}>
                      <Text style={styles.chatTktBadgeText}>
                        {selectedTicket.ticketNumber || selectedTicket.id}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.chatStatusBadge,
                        selectedTicket.status === 'resolved'
                          ? styles.statusBadgeResolved
                          : styles.statusBadgeReview,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatStatusBadgeText,
                          selectedTicket.status === 'resolved'
                            ? styles.statusTextResolved
                            : styles.statusTextReview,
                        ]}
                      >
                        {selectedTicket.status === 'resolved'
                          ? 'Resolved'
                          : selectedTicket.status === 'in_progress'
                          ? 'In Review'
                          : 'In Queue'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                    {selectedTicket.title}
                  </Text>
                </View>

                <View style={styles.chatTopActions}>
                  <TouchableOpacity
                    style={styles.chatRefreshBtn}
                    onPress={() => handleChatRefresh(true)}
                    activeOpacity={0.7}
                    disabled={refreshingChat}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Animated.View
                      style={{
                        transform: [
                          {
                            rotate: spinAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                        ],
                      }}
                    >
                      <Feather name="refresh-cw" size={16} color="#0B3B42" />
                    </Animated.View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeBtnCircle}
                    onPress={() => {
                      setSelectedTicket(null);
                      setTicketsModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Chat Thread + Keyboard Avoiding View */}
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
              >
                <ScrollView
                  ref={chatScrollRef}
                  style={styles.chatScrollView}
                  contentContainerStyle={[
                    styles.chatScrollContent,
                    IS_TABLET && styles.tabletContainer,
                  ]}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshingChat}
                      onRefresh={() => handleChatRefresh(false)}
                      colors={['#0B3B42']}
                      tintColor="#0B3B42"
                    />
                  }
                  onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                  onLayout={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                >
                  {/* Original Doubt Description Card (Screenshot 1 & 2) */}
                  <View style={styles.originalDescCard}>
                    <View style={styles.originalDescHeader}>
                      <Text style={styles.originalDescTitle}>Original Doubt Description</Text>
                      <Text style={styles.originalDescMeta}>
                        {selectedTicket.subject} • {selectedTicket.examTag || cohortName}
                      </Text>
                    </View>
                    <Text style={styles.originalDescBody}>
                      {selectedTicket.description || selectedTicket.questionFull || selectedTicket.title}
                    </Text>

                    {/* Attached Diagrams in Ticket */}
                    {((selectedTicket.diagramUrls && selectedTicket.diagramUrls.length > 0) || selectedTicket.diagramUrl) && (
                      <View style={styles.diagramThumbsRow}>
                        {(selectedTicket.diagramUrls || [selectedTicket.diagramUrl!]).map((url, i) => (
                          <TouchableOpacity
                            key={i}
                            activeOpacity={0.85}
                            onPress={() => setZoomImageUrl(url)}
                            style={styles.diagramThumbWrap}
                          >
                            <Image source={{ uri: url }} style={styles.diagramThumb} />
                            <View style={styles.zoomPill}>
                              <Feather name="maximize-2" size={12} color="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Messages Stream */}
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg) => {
                      const isStudent = msg.sender === 'student';
                      return (
                        <View
                          key={msg.id}
                          style={[
                            styles.messageContainer,
                            isStudent ? styles.msgRight : styles.msgLeft,
                          ]}
                        >
                          {/* Sender Meta Line */}
                          <View
                            style={[
                              styles.senderMetaRow,
                              isStudent ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
                            ]}
                          >
                            <Text style={styles.senderNameText}>{msg.senderName}</Text>
                            <Text style={styles.senderDot}>•</Text>
                            <Text style={styles.senderTimeText}>{msg.time || '10:20 pm'}</Text>
                            {!isStudent && (
                              <View style={styles.verifiedFacultyPill}>
                                <Text style={styles.verifiedFacultyText}>Verified Faculty</Text>
                              </View>
                            )}
                          </View>

                          {/* Bubble */}
                          <View
                            style={[
                              styles.chatBubble,
                              isStudent ? styles.bubbleStudent : styles.bubbleFaculty,
                            ]}
                          >
                            {Boolean(msg.text) && (
                              <Text
                                style={[
                                  styles.bubbleText,
                                  isStudent ? styles.bubbleTextStudent : styles.bubbleTextFaculty,
                                ]}
                              >
                                {msg.text}
                              </Text>
                            )}

                            {/* Attachments inside bubble */}
                            {(msg.attachmentUrls || (msg.attachmentUrl ? [msg.attachmentUrl] : [])).map((attUrl, i) => (
                              <TouchableOpacity
                                key={i}
                                activeOpacity={0.85}
                                onPress={() => setZoomImageUrl(attUrl)}
                                style={styles.msgAttachmentWrap}
                              >
                                <Image source={{ uri: attUrl }} style={styles.msgAttachmentImage} />
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.waitingNoticeBox}>
                      <Text style={styles.waitingNoticeText}>
                        No responses yet. An educator is reviewing your ticket right now.
                      </Text>
                    </View>
                  )}

                  {/* Live WhatsApp-style Teacher Typing Indicator */}
                  {isFacultyTyping && (
                    <View style={styles.liveTypingRow}>
                      <View style={styles.liveTypingBubble}>
                        <Text style={styles.liveTypingText}>Teacher Assistant is typing</Text>
                        <ActivityIndicator size="small" color="#0B3B42" style={{ marginLeft: 6 }} />
                      </View>
                    </View>
                  )}

                  {/* Resolution Requested Banner (if educator requested resolution) */}
                  {selectedTicket.status === 'resolution_requested' && (
                    <View style={styles.resolutionBanner}>
                      <View style={styles.resolutionBannerHeader}>
                        <Feather name="help-circle" size={16} color="#B45309" />
                        <Text style={styles.resolutionBannerTitle}>Teacher Assistant requested resolution</Text>
                      </View>
                      <Text style={styles.resolutionBannerDesc}>
                        Has your doubt been completely cleared? Select an option below to proceed.
                      </Text>
                      <View style={styles.resolutionActionsRow}>
                        <TouchableOpacity
                          style={styles.markSolvedBtn}
                          disabled={resolvingAction}
                          onPress={() => handleResolution('solved')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.markSolvedBtnText}>✓ Mark as Doubt Solved</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.askFollowupBtn}
                          disabled={resolvingAction}
                          onPress={() => handleResolution('followup')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.askFollowupBtnText}>Ask for Follow-up</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Bottom Reply Bar / Waiting Notice */}
                {selectedTicket.status === 'resolved' ? (
                  <View style={styles.resolvedFooterBar}>
                    <Feather name="check-circle" size={16} color="#15803D" style={{ marginRight: 6 }} />
                    <Text style={styles.resolvedFooterText}>
                      This ticket is resolved and closed.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.bottomBarContainer}>
                    {/* Non-blocking Waiting Notice Pill if student sent the latest message */}
                    {isWaitingForFaculty && (
                      <View style={styles.waitingInlineHint}>
                        <Feather name="clock" size={12} color="#0B3B42" />
                        <Text style={styles.waitingInlineHintText}>
                          Waiting for educator reply • You can still type follow-up details
                        </Text>
                      </View>
                    )}

                    {/* Attachment Preview Strip */}
                    {replyImage && (
                      <View style={styles.replyAttachmentPreview}>
                        <Image source={{ uri: replyImage.uri }} style={styles.replyPreviewThumb} />
                        <Text style={styles.replyPreviewText}>Photo attached</Text>
                        <TouchableOpacity
                          onPress={() => setReplyImage(null)}
                          style={styles.replyPreviewRemoveBtn}
                        >
                          <Feather name="x" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Input Strip (Screenshot 1 & 2) */}
                    <View style={styles.inputRow}>
                      <TouchableOpacity
                        style={styles.clipBtn}
                        onPress={() => pickImage(true)}
                        activeOpacity={0.7}
                        disabled={sendingReply}
                      >
                        <Feather name="paperclip" size={20} color="#0B3B42" />
                      </TouchableOpacity>

                      <TextInput
                        style={styles.chatTextInput}
                        placeholder="Type your follow-up doubt or question..."
                        placeholderTextColor="#94A3B8"
                        value={replyText}
                        onChangeText={handleReplyTextChange}
                        multiline
                      />

                      <TouchableOpacity
                        style={[
                          styles.sendBtnCircle,
                          (!replyText.trim() && !replyImage) && styles.sendBtnDisabled,
                        ]}
                        onPress={handleSendReply}
                        disabled={sendingReply || (!replyText.trim() && !replyImage)}
                        activeOpacity={0.85}
                      >
                        {sendingReply ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Feather name="send" size={17} color="#FFFFFF" style={{ marginLeft: 2 }} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </KeyboardAvoidingView>
            </View>
          )}
        </Modal>

        {/* ======================================================== */}
        {/* MODAL 3: FULLSCREEN ZOOM IMAGE VIEWER */}
        {/* ======================================================== */}
        {zoomImageUrl && (
          <Modal
            visible={Boolean(zoomImageUrl)}
            transparent
            animationType="fade"
            onRequestClose={() => setZoomImageUrl(null)}
          >
            <View style={styles.zoomModalRoot}>
              <TouchableOpacity
                style={[
                  styles.zoomCloseBtn,
                  { top: Math.max(insets.top, 30) + 10 },
                ]}
                onPress={() => setZoomImageUrl(null)}
              >
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Image
                source={{ uri: zoomImageUrl }}
                style={styles.zoomImageFull}
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}
      </View>
    </LockedFeatureGuard>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  myTicketsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 6,
  },
  myTicketsBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  myTicketsBadge: {
    backgroundColor: '#0B3B42',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myTicketsBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },

  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabletContainer: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionPill: {
    backgroundColor: '#E2F3E7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#059669',
    letterSpacing: 0.4,
  },
  cohortPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cohortPillLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
  },
  cohortPillValue: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  mainTitle: {
    fontSize: 20,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 6,
  },
  mainDesc: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  subLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
  },
  asterisk: {
    color: '#EF4444',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipSelected: {
    backgroundColor: '#E6F4F1',
    borderColor: '#0B3B42',
    flexDirection: 'row',
    alignItems: 'center',
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0B3B42',
    marginRight: 6,
  },
  catChipText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
  },
  catChipTextSelected: {
    color: '#0B3B42',
    fontFamily: Theme.fonts.bold,
  },

  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
  },
  descLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    minHeight: 90,
  },

  uploadDashedBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadMainText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#334155',
    textAlign: 'center',
  },
  browseHighlight: {
    color: '#0B3B42',
    fontFamily: Theme.fonts.bold,
    textDecorationLine: 'underline',
  },
  uploadSubText: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },

  imagePreviewBox: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#166534',
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B3B42',
    borderRadius: 14,
    paddingVertical: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
  },

  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  footerText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
  },
  footerBold: {
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },
  footerFaq: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },

  /* Modals Common */
  modalScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Tickets List */
  ticketsListScroll: {
    padding: 16,
    gap: 12,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tktPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tktPillText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
  },
  ticketSubject: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
  },
  ticketStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillResolved: {
    backgroundColor: '#DCFCE7',
  },
  statusPillActive: {
    backgroundColor: '#FEF3C7',
  },
  ticketStatusText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
  },
  statusTextResolved: {
    color: '#15803D',
  },
  statusTextActive: {
    color: '#B45309',
  },
  ticketTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  ticketSnippet: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 18,
  },
  ticketCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  ticketMeta: {
    fontSize: 11,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
  },
  openChatPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  openChatText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },

  /* Chat Interface Top Bar (Screenshot 1 & 2) */
  chatTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  chatTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTopMiddle: {
    flex: 1,
    marginHorizontal: 12,
  },
  chatBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  chatTktBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chatTktBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0369A1',
  },
  chatStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeReview: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeResolved: {
    backgroundColor: '#DCFCE7',
  },
  chatStatusBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
  },
  statusTextReview: {
    color: '#B45309',
  },
  chatHeaderTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },

  /* Chat Scroll */
  chatScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatScrollContent: {
    padding: 16,
    paddingBottom: 20,
  },

  /* Original Doubt Description Card (Screenshot 1 & 2) */
  originalDescCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    marginBottom: 16,
  },
  originalDescHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  originalDescTitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  originalDescMeta: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  originalDescBody: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    lineHeight: 19,
  },
  diagramThumbsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  diagramThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  diagramThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  zoomPill: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 3,
  },

  /* Message Stream */
  messageContainer: {
    marginBottom: 12,
    maxWidth: '82%',
  },
  msgRight: {
    alignSelf: 'flex-end',
  },
  msgLeft: {
    alignSelf: 'flex-start',
  },
  senderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
    paddingHorizontal: 4,
  },
  senderNameText: {
    fontSize: 10.5,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
  },
  senderDot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  senderTimeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.regular,
    color: '#94A3B8',
  },
  verifiedFacultyPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 4,
  },
  verifiedFacultyText: {
    fontSize: 9,
    fontFamily: Theme.fonts.bold,
    color: '#15803D',
  },

  chatBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleStudent: {
    backgroundColor: '#0B3B42',
    borderTopRightRadius: 3,
  },
  bubbleFaculty: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 3,
  },
  bubbleText: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    lineHeight: 19,
  },
  bubbleTextStudent: {
    color: '#FFFFFF',
  },
  bubbleTextFaculty: {
    color: '#0F172A',
  },

  msgAttachmentWrap: {
    width: 140,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: '#0F172A',
  },
  msgAttachmentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  waitingNoticeBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    marginVertical: 12,
  },
  waitingNoticeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
  },

  /* Resolution Requested Banner */
  resolutionBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: 14,
    marginTop: 10,
  },
  resolutionBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resolutionBannerTitle: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.bold,
    color: '#92400E',
  },
  resolutionBannerDesc: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    color: '#78350F',
    marginBottom: 10,
    lineHeight: 16,
  },
  resolutionActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  markSolvedBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  markSolvedBtnText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  askFollowupBtn: {
    flex: 1,
    backgroundColor: '#0B3B42',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  askFollowupBtnText: {
    fontSize: 11.5,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },

  /* Footers & Input Bar (Screenshot 1 & 2) */
  resolvedFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  resolvedFooterText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#15803D',
  },
  waitingFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  waitingFooterText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  liveTypingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  liveTypingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveTypingText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#475569',
    fontStyle: 'italic',
  },
  waitingInlineHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
    gap: 6,
  },
  waitingInlineHintText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#0F766E',
  },

  bottomBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyAttachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
    gap: 6,
  },
  replyPreviewThumb: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  replyPreviewText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#334155',
  },
  replyPreviewRemoveBtn: {
    padding: 2,
    marginLeft: 4,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clipBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0B3B42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },

  /* Zoom Modal */
  zoomModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImageFull: {
    width: '94%',
    height: '80%',
  },
});
