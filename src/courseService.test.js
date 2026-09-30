import { webcrypto, createHash } from 'crypto';
import { TextEncoder } from 'util';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { getDoc, getDocs, runTransaction, writeBatch } from 'firebase/firestore';
import { listCourses, joinCourse, saveCourse, loginEmailInstructor, registerInstructorAccount, resendInstructorVerification, resetInstructorPassword, deleteInstructor, courseError } from './courseService';
let mockConfigured = true;
jest.mock('./firebase', () => ({ db: {}, get firebaseConfigured() { return mockConfigured; } }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(), signInAnonymously: jest.fn(), GoogleAuthProvider: jest.fn(), signInWithPopup: jest.fn(), signOut: jest.fn(), signInWithEmailAndPassword: jest.fn(), createUserWithEmailAndPassword: jest.fn(), sendEmailVerification: jest.fn(), sendPasswordResetEmail: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ name }),
  doc: (_db, collection, id) => id ? ({ id, path: `${collection}/${id}` }) : ({ id: 'generated-course', path: 'workbookCourses/generated-course' }),
  getDoc: jest.fn(), getDocs: jest.fn(), orderBy: name => ({ orderBy: name }),
  query: (collection, condition) => ({ collection, condition }), where: (key, op, value) => ({ key, op, value }),
  runTransaction: jest.fn(), serverTimestamp: () => 'server-time', setDoc: jest.fn(), writeBatch: jest.fn(),
}));
beforeAll(() => { Object.defineProperty(window, 'crypto', { value: webcrypto }); global.TextEncoder = TextEncoder; });
beforeEach(() => { mockConfigured = true; jest.resetAllMocks(); signOut.mockResolvedValue(); });
test('unconfigured Firebase does not start authentication or database requests', async () => {
  mockConfigured = false;
  await expect(listCourses()).rejects.toThrow('아직 연결되지 않았습니다');
  await expect(joinCourse({ courseId: 'general', major: '전공', nickname: '학생' })).rejects.toThrow('아직 연결되지 않았습니다');
  expect(getAuth).not.toHaveBeenCalled(); expect(getDocs).not.toHaveBeenCalled();
});
test('student course join writes hashed proof atomically and preserves profile fields with merge', async () => {
  const user = { uid: 'student1' }; const auth = { currentUser: user, authStateReady: jest.fn().mockResolvedValue() };
  getAuth.mockReturnValue(auth);
  const transaction = { get: jest.fn(ref => Promise.resolve({ exists: () => true, data: () => ref.path.startsWith('workbookCourses') ? { name: '수업 A', active: true, codeSalt: 'a'.repeat(32) } : { joinedAt: 'original-time', experienceSummary: '기존 내용' } })), set: jest.fn() };
  runTransaction.mockImplementation((_db, task) => task(transaction));
  await expect(joinCourse({ courseId: 'course1', accessCode: '1234', major: ' 전공 ', nickname: ' 학생 ' })).resolves.toEqual({ courseId: 'course1', courseName: '수업 A' });
  expect(signInAnonymously).not.toHaveBeenCalled();
  const participant = transaction.set.mock.calls[0][1];
  expect(participant.entryProof).toBe(createHash('sha256').update(`${'a'.repeat(32)}:1234`).digest('hex'));
  expect(participant.joinedAt).toBe('original-time');
  expect(participant).not.toHaveProperty('accessCode');
  expect(transaction.set.mock.calls[1][2]).toEqual({ merge: true });
});
test('course save separates public metadata and secret hash in one batch', async () => {
  getAuth.mockReturnValue({ authStateReady: jest.fn().mockResolvedValue(), currentUser: { email: 'agnes626@hanyang.ac.kr', emailVerified: true, providerData: [{ providerId: 'google.com' }] } });
  const batch = { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue() };
  writeBatch.mockReturnValue(batch);
  await saveCourse({ id: null, name: ' 새 수업 ', accessCode: '1234', active: true });
  const secret = batch.set.mock.calls[0][1]; const course = batch.set.mock.calls[1][1];
  expect(secret.codeHash).toBe(createHash('sha256').update(`${course.codeSalt}:1234`).digest('hex'));
  expect(course).not.toHaveProperty('codeHash'); expect(secret).not.toHaveProperty('accessCode');
  expect(batch.commit).toHaveBeenCalledTimes(1);
});

const passwordUser = (email = 'next@example.edu', emailVerified = true) => ({ email, emailVerified, providerData: [{ providerId: 'password' }] });
const passwordAuth = user => {
  const auth = { currentUser: user, authStateReady: jest.fn().mockResolvedValue() };
  getAuth.mockReturnValue(auth); signInWithEmailAndPassword.mockResolvedValue({ user });
  return auth;
};
test('verified registered password instructor loads the same dashboard without owner privileges', async () => {
  const auth = passwordAuth(passwordUser());
  getDoc.mockResolvedValue({ exists: () => true, data: () => ({ active: true }) });
  getDocs.mockResolvedValue({ docs: [] });
  const dashboard = await loginEmailInstructor({ email: ' Next@Example.edu ', password: 'test-password' });
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'next@example.edu', 'test-password');
  expect(dashboard).toEqual({ canManageInstructors: false, instructors: [], courses: [], participants: [] });
  expect(signOut).not.toHaveBeenCalled();
});
test('unverified password account is signed out before any private Firestore read', async () => {
  const auth = passwordAuth(passwordUser('next@example.edu', false));
  await expect(loginEmailInstructor({ email: 'next@example.edu', password: 'test-password' })).rejects.toThrow('이메일 인증이 필요합니다');
  expect(getDoc).not.toHaveBeenCalled(); expect(getDocs).not.toHaveBeenCalled();
  expect(signOut).toHaveBeenCalledWith(auth);
});
test('verified but unregistered or deactivated account cannot read participant lists', async () => {
  const auth = passwordAuth(passwordUser());
  getDoc.mockResolvedValue({ exists: () => true, data: () => ({ active: false }) });
  await expect(loginEmailInstructor({ email: 'next@example.edu', password: 'test-password' })).rejects.toThrow('교수자 권한이 없습니다');
  expect(getDocs).not.toHaveBeenCalled(); expect(signOut).toHaveBeenCalledWith(auth);
});
test('account creation sends email verification and signs out without assigning instructor privileges', async () => {
  const user = passwordUser('next@example.edu', false); const auth = passwordAuth(user);
  createUserWithEmailAndPassword.mockResolvedValue({ user }); sendEmailVerification.mockResolvedValue();
  await registerInstructorAccount({ email: ' Next@Example.edu ', password: 'test-password' });
  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'next@example.edu', 'test-password');
  expect(sendEmailVerification).toHaveBeenCalledWith(user, { url: 'http://localhost/admin' });
  expect(signOut).toHaveBeenCalledWith(auth); expect(getDocs).not.toHaveBeenCalled();
  sendEmailVerification.mockRejectedValueOnce(new Error('mail failure'));
  await expect(registerInstructorAccount({ email: 'next@example.edu', password: 'test-password' })).rejects.toThrow('mail failure');
  expect(signOut).toHaveBeenCalledTimes(2);
});
test('verification resend signs out and password reset does not expose account existence', async () => {
  const user = passwordUser('next@example.edu', false); const auth = passwordAuth(user);
  sendEmailVerification.mockResolvedValue();
  await expect(resendInstructorVerification({ email: 'next@example.edu', password: 'test-password' })).resolves.toEqual({ alreadyVerified: false });
  expect(signOut).toHaveBeenCalledWith(auth);
  sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });
  await expect(resetInstructorPassword(' Next@Example.edu ')).resolves.toBeUndefined();
  expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'next@example.edu', { url: 'http://localhost/admin' });
  expect(courseError({ code: 'auth/invalid-credential' })).toContain('이메일과 비밀번호');
});
test('instructor deletion requires owner and inactive membership inside a transaction', async () => {
  passwordAuth(passwordUser('agnes626@hanyang.ac.kr'));
  const transaction = { get: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ active: true }) }), delete: jest.fn() };
  runTransaction.mockImplementation((_db, task) => task(transaction));
  await expect(deleteInstructor('next@example.edu')).rejects.toThrow('먼저 중지');
  expect(transaction.delete).not.toHaveBeenCalled();
  transaction.get.mockResolvedValue({ exists: () => true, data: () => ({ active: false }) });
  await deleteInstructor('next@example.edu');
  expect(transaction.delete).toHaveBeenCalledWith({ id: 'next@example.edu', path: 'workbookInstructors/next@example.edu' });
  await expect(deleteInstructor('agnes626@hanyang.ac.kr')).rejects.toThrow('삭제할 수 없습니다');
  passwordAuth(passwordUser());
  await expect(deleteInstructor('other@example.edu')).rejects.toThrow('총괄 관리자만');
});
