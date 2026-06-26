import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMsg {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  data?: any;
  timestamp?: Date;
}

interface ChatStoreState {
  aiTutorMessages: Record<string, ChatMsg[]>;
  studentOcrMessages: Record<string, ChatMsg[]>;
  teacherOcrMessages: Record<string, ChatMsg[]>;
  
  // Helpers
  addAiTutorMessage: (userId: string, msg: ChatMsg) => void;
  setAiTutorMessages: (userId: string, msgs: ChatMsg[]) => void;
  clearAiTutorMessages: (userId: string) => void;

  addStudentOcrMessage: (userId: string, msg: ChatMsg) => void;
  setStudentOcrMessages: (userId: string, msgs: ChatMsg[]) => void;
  clearStudentOcrMessages: (userId: string) => void;

  addTeacherOcrMessage: (userId: string, msg: ChatMsg) => void;
  setTeacherOcrMessages: (userId: string, msgs: ChatMsg[]) => void;
  clearTeacherOcrMessages: (userId: string) => void;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      aiTutorMessages: {},
      studentOcrMessages: {},
      teacherOcrMessages: {},

      addAiTutorMessage: (userId, msg) => set((state) => ({
        aiTutorMessages: {
          ...state.aiTutorMessages,
          [userId]: [...(state.aiTutorMessages[userId] || []), msg]
        }
      })),
      setAiTutorMessages: (userId, msgs) => set((state) => ({
        aiTutorMessages: {
          ...state.aiTutorMessages,
          [userId]: msgs
        }
      })),
      clearAiTutorMessages: (userId) => set((state) => ({
        aiTutorMessages: {
          ...state.aiTutorMessages,
          [userId]: []
        }
      })),

      addStudentOcrMessage: (userId, msg) => set((state) => ({
        studentOcrMessages: {
          ...state.studentOcrMessages,
          [userId]: [...(state.studentOcrMessages[userId] || []), msg]
        }
      })),
      setStudentOcrMessages: (userId, msgs) => set((state) => ({
        studentOcrMessages: {
          ...state.studentOcrMessages,
          [userId]: msgs
        }
      })),
      clearStudentOcrMessages: (userId) => set((state) => ({
        studentOcrMessages: {
          ...state.studentOcrMessages,
          [userId]: []
        }
      })),

      addTeacherOcrMessage: (userId, msg) => set((state) => ({
        teacherOcrMessages: {
          ...state.teacherOcrMessages,
          [userId]: [...(state.teacherOcrMessages[userId] || []), msg]
        }
      })),
      setTeacherOcrMessages: (userId, msgs) => set((state) => ({
        teacherOcrMessages: {
          ...state.teacherOcrMessages,
          [userId]: msgs
        }
      })),
      clearTeacherOcrMessages: (userId) => set((state) => ({
        teacherOcrMessages: {
          ...state.teacherOcrMessages,
          [userId]: []
        }
      })),
    }),
    {
      name: 'lms-chat-storage',
      // Ensure we do not save base64 images that would exceed localStorage limits
      partialize: (state) => {
        const cleanMessages = (record: Record<string, ChatMsg[]>) => {
          const cleaned: Record<string, ChatMsg[]> = {};
          for (const [userId, msgs] of Object.entries(record)) {
            cleaned[userId] = msgs.map(m => {
              if (m.images && m.images.length > 0) {
                // Return message without base64 images to save space
                return { ...m, images: [] };
              }
              return m;
            });
          }
          return cleaned;
        };
        
        return {
          aiTutorMessages: cleanMessages(state.aiTutorMessages),
          studentOcrMessages: cleanMessages(state.studentOcrMessages),
          teacherOcrMessages: cleanMessages(state.teacherOcrMessages),
        };
      }
    }
  )
);
