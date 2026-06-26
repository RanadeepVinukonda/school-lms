import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getAdminAuth, getAdminFirestore } from '../firebase/admin';

const STUDENT = {
  email: 'student@genesis.edu',
  password: 'student123',
  displayName: 'Test Student',
  role: 'student',
};

const TEACHER = {
  email: 'teacher@genesis.edu',
  password: 'teacher123',
  displayName: 'Test Teacher',
  role: 'teacher',
};

async function main() {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  for (const user of [STUDENT, TEACHER]) {
    try {
      const existing = await auth.getUserByEmail(user.email);
      console.log(`User ${user.email} already exists (uid: ${existing.uid})`);
      await auth.setCustomUserClaims(existing.uid, { role: user.role });
      await db.doc(`users/${existing.uid}`).set({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      console.log(`Updated ${user.role}: ${user.email}`);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        const record = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
        });
        await auth.setCustomUserClaims(record.uid, { role: user.role });
        await db.doc(`users/${record.uid}`).set({
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`Created ${user.role}: ${user.email} (uid: ${record.uid})`);
      } else {
        console.error(`Error for ${user.email}:`, err.message);
      }
    }
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
