import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { UserProfile, UserRole, ApiError } from '../types';

const errorMessages: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Invalid email or password',
  'auth/invalid-credential': 'Invalid email or password',
  'auth/invalid-email': 'Invalid email address',
  'auth/user-disabled': 'This account has been disabled',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password should be at least 6 characters',
};

function getFirebaseErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return errorMessages[code] || (error as Error).message || 'An unexpected error occurred';
  }
  return 'An unexpected error occurred';
}

export const authService = {
  async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken();

      const doc = await firestore().collection('users').doc(firebaseUser.uid).get();
      if (!doc.exists) {
        throw new Error('User profile not found');
      }

      const data = doc.data() as Record<string, unknown>;
      const role = (data.role as UserRole) || 'student';

      const user: UserProfile = {
        id: doc.id,
        email: (data.email as string) || firebaseUser.email || '',
        displayName: (data.displayName as string) || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        role,
        isActive: (data.isActive as boolean) ?? true,
        avatar: (data.avatar as string) || firebaseUser.photoURL || undefined,
        firstName: data.firstName as string | undefined,
        lastName: data.lastName as string | undefined,
        phone: data.phone as string | undefined,
        dateOfBirth: data.dateOfBirth as string | undefined,
        bio: data.bio as string | undefined,
        address: data.address as string | undefined,
        classIds: data.classIds as string[] | undefined,
        studentId: data.studentId as string | undefined,
        teacherId: data.teacherId as string | undefined,
        classId: data.classId as string | undefined,
        tutorialSeen: data.tutorialSeen as boolean | undefined,
        createdAt: (data.createdAt as string) || new Date().toISOString(),
        updatedAt: (data.updatedAt as string) || new Date().toISOString(),
      };

      return { user, token };
    } catch (error) {
      throw new Error(getFirebaseErrorMessage(error));
    }
  },

  async logout(): Promise<void> {
    await auth().signOut();
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    const firebaseUser = auth().currentUser;
    if (!firebaseUser) return null;

    const doc = await firestore().collection('users').doc(firebaseUser.uid).get();
    if (!doc.exists) return null;

    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      email: (data.email as string) || firebaseUser.email || '',
      displayName: (data.displayName as string) || firebaseUser.displayName || '',
      role: (data.role as UserRole) || 'student',
      isActive: (data.isActive as boolean) ?? true,
      avatar: data.avatar as string | undefined,
      firstName: data.firstName as string | undefined,
      lastName: data.lastName as string | undefined,
      phone: data.phone as string | undefined,
      dateOfBirth: data.dateOfBirth as string | undefined,
      bio: data.bio as string | undefined,
      address: data.address as string | undefined,
      classIds: data.classIds as string[] | undefined,
      studentId: data.studentId as string | undefined,
      teacherId: data.teacherId as string | undefined,
      classId: data.classId as string | undefined,
      tutorialSeen: data.tutorialSeen as boolean | undefined,
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      updatedAt: (data.updatedAt as string) || new Date().toISOString(),
    };
  },

  async forgotPassword(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error) {
      throw new Error(getFirebaseErrorMessage(error));
    }
  },
};
