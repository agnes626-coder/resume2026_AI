import { getAuth, GoogleAuthProvider, signInAnonymously, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db, firebaseConfigured } from "./firebase";

const OWNER_EMAIL = "agnes626@hanyang.ac.kr";
const normalizedEmail = email => String(email || "").trim().toLowerCase();
const fail = message => { throw new Error(message); };
const requireFirebase = () => {
  if (!firebaseConfigured) fail("Firebase 프로젝트가 아직 연결되지 않았습니다. 무료 프로젝트를 만들고 연결 설정을 입력해주세요.");
};
const publicCourse = snapshot => ({ id: snapshot.id, name: snapshot.data().name, active: snapshot.data().active === true });
async function entryProof(salt, code) {
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${code}`));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function newSalt() {
  return Array.from(window.crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
}
async function instructorAccess(ownerOnly = false) {
  requireFirebase();
  const auth = getAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user?.emailVerified || !user.providerData.some(provider => ["google.com", "password"].includes(provider.providerId))) fail("이메일 인증을 완료한 교수자 계정으로 로그인해주세요.");
  const email = normalizedEmail(user.email);
  if (email === OWNER_EMAIL) return { email, owner: true };
  if (ownerOnly) fail("교수자 계정 관리는 총괄 관리자만 사용할 수 있습니다.");
  const member = await getDoc(doc(db, "workbookInstructors", email));
  if (!member.exists() || member.data().active !== true) fail("교수자 권한이 없습니다. 총괄 관리자에게 이 이메일의 교수자 등록과 접근 허용을 요청해주세요.");
  return { email, owner: false };
}
export async function listCourses() {
  requireFirebase();
  const courses = await getDocs(query(collection(db, "workbookCourses"), where("active", "==", true)));
  return { courses: courses.docs.map(publicCourse).sort((a, b) => a.name.localeCompare(b.name, "ko")) };
}
export async function joinCourse({ courseId, accessCode, major, nickname }) {
  requireFirebase();
  const auth = getAuth();
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  const uid = auth.currentUser.uid;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(courseId) || !major.trim() || major.trim().length > 120 || !nickname.trim() || nickname.trim().length > 80) fail("교과목, 전공, 닉네임을 확인해주세요.");
  const participant = doc(db, "workbookParticipants", `${courseId}_${uid}`);
  const profile = doc(db, "students", uid);
  try {
    return await runTransaction(db, async transaction => {
      let courseName = "일반참가용";
      let proof = "";
      if (courseId !== "general") {
        if (typeof accessCode !== "string" || accessCode.length < 4 || accessCode.length > 64) fail("인증번호는 4~64자로 입력해주세요.");
        const course = await transaction.get(doc(db, "workbookCourses", courseId));
        if (!course.exists() || !course.data().active) fail("입장이 중지되었거나 없는 교과목입니다.");
        courseName = course.data().name;
        proof = await entryProof(course.data().codeSalt, accessCode);
      }
      const previous = await transaction.get(participant);
      const existingProfile = await transaction.get(profile);
      const fields = { uid, courseId, courseName, major: major.trim(), nickname: nickname.trim(), updatedAt: serverTimestamp() };
      transaction.set(participant, { ...fields, entryProof: proof, joinedAt: previous.exists() ? previous.data().joinedAt : serverTimestamp() });
      transaction.set(profile, { ...fields, ...(!existingProfile.exists() ? { joinedAt: serverTimestamp() } : {}) }, { merge: true });
      return { courseId, courseName };
    });
  } catch (error) {
    if (error.code === "permission-denied" && courseId !== "general") fail("인증번호가 올바르지 않거나 입장이 중지되었습니다. 계속 실패하면 Firebase 보안 규칙 설정을 확인해주세요.");
    throw error;
  }
}
export async function loginInstructor() {
  requireFirebase();
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
  return loadDashboard();
}
const emailAuth = () => {
  requireFirebase();
  const auth = getAuth();
  auth.languageCode = "ko";
  return auth;
};
const accountEmail = email => {
  const normalized = normalizedEmail(email);
  if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(normalized) || normalized.length > 254) fail("올바른 이메일을 입력해주세요.");
  return normalized;
};
const emailActionSettings = () => ({ url: new URL("/admin", window.location.origin).href });
export async function loginEmailInstructor({ email, password }) {
  const auth = emailAuth();
  const { user } = await signInWithEmailAndPassword(auth, accountEmail(email), password);
  try {
    if (!user.emailVerified) fail("이메일 인증이 필요합니다. 받은 메일의 인증 링크를 누른 뒤 다시 로그인하세요. 메일을 받지 못했다면 인증 메일 다시 보내기를 이용하세요.");
    return await loadDashboard();
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}
export async function registerInstructorAccount({ email, password }) {
  const auth = emailAuth();
  const { user } = await createUserWithEmailAndPassword(auth, accountEmail(email), password);
  try { await sendEmailVerification(user, emailActionSettings()); }
  finally { await signOut(auth); }
}
export async function resendInstructorVerification({ email, password }) {
  const auth = emailAuth();
  const { user } = await signInWithEmailAndPassword(auth, accountEmail(email), password);
  try {
    if (user.emailVerified) return { alreadyVerified: true };
    await sendEmailVerification(user, emailActionSettings());
    return { alreadyVerified: false };
  } finally { await signOut(auth); }
}
export async function resetInstructorPassword(email) {
  const auth = emailAuth();
  try { await sendPasswordResetEmail(auth, accountEmail(email), emailActionSettings()); }
  catch (error) { if (error.code !== "auth/user-not-found") throw error; }
}
export async function loadDashboard() {
  const access = await instructorAccess();
  const [courses, participants, instructors] = await Promise.all([
    getDocs(collection(db, "workbookCourses")),
    getDocs(query(collection(db, "workbookParticipants"), orderBy("updatedAt", "desc"))),
    access.owner ? getDocs(collection(db, "workbookInstructors")) : Promise.resolve(null),
  ]);
  return {
    canManageInstructors: access.owner,
    instructors: instructors ? instructors.docs.map(snapshot => ({ email: snapshot.data().email, active: snapshot.data().active })) : [],
    courses: courses.docs.map(publicCourse).sort((a, b) => a.name.localeCompare(b.name, "ko")),
    participants: participants.docs.map(snapshot => {
      const data = snapshot.data();
      return { id: snapshot.id, courseId: data.courseId, courseName: data.courseName, nickname: data.nickname, major: data.major, joinedAt: data.joinedAt?.toDate().toISOString() || null, updatedAt: data.updatedAt?.toDate().toISOString() || null };
    }),
  };
}
export async function saveCourse({ id, name, accessCode, active }) {
  await instructorAccess();
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName || trimmedName.length > 120 || typeof active !== "boolean") fail("교과목명과 입장 허용 여부를 확인해주세요.");
  if (id && (!/^[a-zA-Z0-9_-]{1,128}$/.test(id) || id === "general")) fail("올바른 교과목을 선택해주세요.");
  if (typeof accessCode !== "string" || (!id && !accessCode) || (accessCode && (accessCode.length < 4 || accessCode.length > 64))) fail("인증번호는 4~64자로 입력해주세요.");
  const course = id ? doc(db, "workbookCourses", id) : doc(collection(db, "workbookCourses"));
  const fields = { name: trimmedName, active, updatedAt: serverTimestamp() };
  const batch = writeBatch(db);
  if (accessCode) {
    fields.codeSalt = newSalt();
    batch.set(doc(db, "workbookCourseSecrets", course.id), { codeSalt: fields.codeSalt, codeHash: await entryProof(fields.codeSalt, accessCode), updatedAt: serverTimestamp() });
  }
  if (!id) fields.createdAt = serverTimestamp();
  if (id) batch.update(course, fields); else batch.set(course, fields);
  await batch.commit();
  return { id: course.id };
}
export async function saveInstructor({ email, active }) {
  const owner = await instructorAccess(true);
  const normalized = normalizedEmail(email);
  if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(normalized) || normalized.length > 254 || typeof active !== "boolean") fail("교수자 이메일과 접근 허용 여부를 확인해주세요.");
  if (normalized === OWNER_EMAIL) fail("총괄 관리자는 이 화면에서 변경할 수 없습니다.");
  await setDoc(doc(db, "workbookInstructors", normalized), { email: normalized, active, updatedBy: owner.email, updatedAt: serverTimestamp() });
  return { email: normalized, active };
}
export async function deleteInstructor(email) {
  await instructorAccess(true);
  const normalized = accountEmail(email);
  if (normalized === OWNER_EMAIL) fail("총괄 관리자는 삭제할 수 없습니다.");
  const ref = doc(db, "workbookInstructors", normalized);
  await runTransaction(db, async transaction => {
    const member = await transaction.get(ref);
    if (!member.exists()) fail("이미 삭제되었거나 등록되지 않은 교수자입니다. 목록을 새로고침해주세요.");
    if (member.data().active !== false) fail("교수자 접근을 먼저 중지한 뒤 삭제해주세요.");
    transaction.delete(ref);
  });
}
export const logoutInstructor = () => signOut(getAuth());
export function courseError(error) {
  if (error.code === "permission-denied") return "접근 권한이 없거나 Firebase 보안 규칙이 아직 적용되지 않았습니다. 교수자 계정과 보안 규칙을 확인해주세요.";
  if (error.code === "auth/popup-closed-by-user") return "로그인 창이 닫혔습니다. 다시 시도해주세요.";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(error.code)) return "이메일과 비밀번호를 확인해주세요. 처음 이용하는 분은 계정 만들기를 선택하세요.";
  if (error.code === "auth/invalid-email") return "올바른 이메일을 입력해주세요.";
  if (error.code === "auth/email-already-in-use") return "이미 가입된 이메일입니다. 로그인하거나 비밀번호 재설정을 이용하세요.";
  if (error.code === "auth/weak-password" || error.code === "auth/password-does-not-meet-requirements") return "비밀번호가 너무 짧거나 비밀번호 정책을 충족하지 않습니다. 6자 이상으로 입력하고 다시 시도해주세요.";
  if (error.code === "auth/user-disabled") return "사용이 중지된 계정입니다. 총괄 관리자에게 문의해주세요.";
  if (error.code === "auth/too-many-requests") return "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.";
  if (error.code === "auth/network-request-failed") return "네트워크 연결을 확인하고 다시 시도해주세요.";
  if (error.code?.startsWith("auth/")) return "Firebase Authentication의 이메일/비밀번호·Google·익명 로그인과 승인된 도메인 설정을 확인해주세요.";
  if (!error.code && error.message) return error.message;
  return "Firebase 연결과 보안 규칙 설정을 확인해주세요. 무료 한도가 소진된 경우에도 연결이 제한될 수 있습니다.";
}
