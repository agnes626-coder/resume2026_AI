const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { collection, doc, getDoc, getDocs, query, where, writeBatch, setDoc, deleteDoc, serverTimestamp, Timestamp } = require('firebase/firestore');
let env;
const salt = 'a'.repeat(32);
const hash = code => createHash('sha256').update(`${salt}:${code}`).digest('hex');
const google = email => ({ email, email_verified: true, firebase: { sign_in_provider: 'google.com' } });
const ownerDb = () => env.authenticatedContext('owner', google('agnes626@hanyang.ac.kr')).firestore();
const studentDb = id => env.authenticatedContext(id, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const participant = (uid, courseId = 'course1', proof = hash('1234')) => ({ uid, courseId, courseName: courseId === 'general' ? '일반참가용' : '수업 A', major: '전공', nickname: '학생', entryProof: courseId === 'general' ? '' : proof, joinedAt: serverTimestamp(), updatedAt: serverTimestamp() });
const createCourse = async (db, courseId = 'course1', active = true) => {
  const batch = writeBatch(db);
  batch.set(doc(db, 'workbookCourses', courseId), { name: '수업 A', active, codeSalt: salt, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.set(doc(db, 'workbookCourseSecrets', courseId), { codeSalt: salt, codeHash: hash('1234'), updatedAt: serverTimestamp() });
  return batch.commit();
};
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-resume-workbook', firestore: { host: '127.0.0.1', port: 8488, rules: fs.readFileSync('../../firestore.rules', 'utf8') } });
});
beforeEach(async () => { await env.clearFirestore(); await createCourse(ownerDb()); });
after(async () => { if (env) await env.cleanup(); });

test('public course listing exposes names and salt, while secrets and private participants stay protected', async () => {
  const publicDb = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDocs(query(collection(publicDb, 'workbookCourses'), where('active', '==', true))));
  await assertFails(getDocs(collection(publicDb, 'workbookCourses')));
  await assertFails(getDoc(doc(publicDb, 'workbookCourseSecrets', 'course1')));
  await assertFails(getDocs(collection(publicDb, 'workbookParticipants')));
});
test('valid proof registers a student; incorrect proof, another UID, and extra fields are denied', async () => {
  const db = studentDb('student1');
  await assertSucceeds(getDoc(doc(db, 'workbookParticipants', 'course1_student1')));
  await assertFails(setDoc(doc(db, 'workbookParticipants', 'course1_student1'), participant('student1', 'course1', hash('wrong'))));
  await assertFails(setDoc(doc(db, 'workbookParticipants', 'course1_student2'), participant('student2')));
  await assertFails(setDoc(doc(db, 'workbookParticipants', 'course1_student1'), { ...participant('student1'), role: 'owner' }));
  await assertSucceeds(setDoc(doc(db, 'workbookParticipants', 'course1_student1'), participant('student1')));
  await assertFails(getDoc(doc(studentDb('student2'), 'workbookParticipants', 'course1_student1')));
  await assertFails(getDocs(collection(db, 'workbookParticipants')));
  await assertFails(getDoc(doc(db, 'workbookCourseSecrets', 'course1')));
});
test('general admission has no course code and requires a correctly identified participant', async () => {
  const db = studentDb('generalStudent');
  await assertSucceeds(setDoc(doc(db, 'workbookParticipants', 'general_generalStudent'), participant('generalStudent', 'general')));
  await assertFails(setDoc(doc(db, 'workbookParticipants', 'general_fakeStudent'), participant('fakeStudent', 'general')));
});
test('repeat admission preserves joinedAt and rejects forged names and changed membership', async () => {
  const db = studentDb('student1'); const ref = doc(db, 'workbookParticipants', 'course1_student1');
  await setDoc(ref, participant('student1'));
  const saved = (await getDoc(ref)).data();
  await assertSucceeds(setDoc(ref, { ...saved, nickname: '새 닉네임', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(ref, { ...saved, courseName: '다른 수업', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(ref, { ...saved, joinedAt: Timestamp.fromMillis(0), updatedAt: serverTimestamp() }));
});
test('inactive courses and rotated codes block old admission proofs', async () => {
  const db = ownerDb();
  await setDoc(doc(db, 'workbookCourses', 'course1'), { active: false, updatedAt: serverTimestamp() }, { merge: true });
  await assertFails(setDoc(doc(studentDb('student1'), 'workbookParticipants', 'course1_student1'), participant('student1')));
  await setDoc(doc(db, 'workbookCourses', 'course1'), { active: true, updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, 'workbookCourseSecrets', 'course1'), { codeSalt: salt, codeHash: hash('newcode'), updatedAt: serverTimestamp() });
  await assertFails(setDoc(doc(studentDb('student1'), 'workbookParticipants', 'course1_student1'), participant('student1')));
  await assertSucceeds(setDoc(doc(studentDb('student1'), 'workbookParticipants', 'course1_student1'), participant('student1', 'course1', hash('newcode'))));
});
test('course creation and code changes must keep public salt and secret salt consistent', async () => {
  const db = ownerDb();
  const batch = writeBatch(db);
  batch.set(doc(db, 'workbookCourses', 'bad'), { name: '수업', active: true, codeSalt: salt, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.set(doc(db, 'workbookCourseSecrets', 'bad'), { codeSalt: 'b'.repeat(32), codeHash: hash('1234'), updatedAt: serverTimestamp() });
  await assertFails(batch.commit());
  await assertFails(createCourse(studentDb('student1'), 'unauthorized'));
});
test('verified Google owner grants instructor access; instructor manages courses but not roles', async () => {
  const db = ownerDb(); const email = 'next@example.edu'; const ref = doc(db, 'workbookInstructors', email);
  const fields = { email, active: true, updatedBy: 'agnes626@hanyang.ac.kr', updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(ref, fields));
  const next = env.authenticatedContext('next', google(email)).firestore();
  await assertSucceeds(getDoc(doc(next, 'workbookInstructors', email)));
  await assertSucceeds(createCourse(next, 'course2'));
  await assertSucceeds(getDocs(collection(next, 'workbookParticipants')));
  await assertFails(getDocs(collection(next, 'workbookInstructors')));
  await assertFails(setDoc(doc(next, 'workbookInstructors', 'other@example.edu'), { ...fields, email: 'other@example.edu', updatedBy: email }));
  await assertFails(setDoc(doc(studentDb('student1'), 'workbookInstructors', 'fake@example.edu'), { ...fields, email: 'fake@example.edu' }));
  await setDoc(ref, { ...fields, active: false });
  await assertFails(getDocs(collection(next, 'workbookParticipants')));
});
test('unverified owner identities and unsupported providers cannot manage courses', async () => {
  const unverified = env.authenticatedContext('unverified', { ...google('agnes626@hanyang.ac.kr'), email_verified: false }).firestore();
  const unverifiedPassword = env.authenticatedContext('unverifiedPassword', { ...google('agnes626@hanyang.ac.kr'), email_verified: false, firebase: { sign_in_provider: 'password' } }).firestore();
  const unsupported = env.authenticatedContext('unsupported', { ...google('agnes626@hanyang.ac.kr'), firebase: { sign_in_provider: 'custom' } }).firestore();
  await assertFails(createCourse(unverified, 'bad1')); await assertFails(createCourse(unverifiedPassword, 'bad2')); await assertFails(createCourse(unsupported, 'bad3'));
});

test('verified password instructors share dashboard access but cannot grant roles or bypass registration', async () => {
  const email = 'password@example.edu'; const db = ownerDb();
  const passwordDb = (uid, verified = true, address = email) => env.authenticatedContext(uid, { email: address, email_verified: verified, firebase: { sign_in_provider: 'password' } }).firestore();
  const fields = { email, active: true, updatedBy: 'agnes626@hanyang.ac.kr', updatedAt: serverTimestamp() };
  await setDoc(doc(db, 'workbookInstructors', email), fields);
  const registered = passwordDb('registered');
  await assertSucceeds(createCourse(registered, 'passwordCourse'));
  await assertSucceeds(getDocs(collection(registered, 'workbookParticipants')));
  await assertFails(getDocs(collection(registered, 'workbookInstructors')));
  await assertFails(setDoc(doc(registered, 'workbookInstructors', 'fake@example.edu'), { ...fields, email: 'fake@example.edu', updatedBy: email }));
  const unverified = passwordDb('unverified', false);
  await assertFails(getDocs(collection(unverified, 'workbookParticipants')));
  await assertFails(getDoc(doc(unverified, 'workbookInstructors', email)));
  await assertFails(getDocs(collection(passwordDb('unregistered', true, 'other@example.edu'), 'workbookParticipants')));
  await setDoc(doc(db, 'workbookInstructors', email), { ...fields, active: false });
  await assertFails(getDocs(collection(registered, 'workbookParticipants')));
});

test('verified password owner manages roles and deletes only stopped instructors', async () => {
  const email = 'stopped@example.edu';
  const owner = env.authenticatedContext('passwordOwner', { ...google('agnes626@hanyang.ac.kr'), firebase: { sign_in_provider: 'password' } }).firestore();
  const fields = { email, active: true, updatedBy: 'agnes626@hanyang.ac.kr', updatedAt: serverTimestamp() };
  const ref = doc(owner, 'workbookInstructors', email);
  await assertSucceeds(setDoc(ref, fields));
  await assertFails(deleteDoc(ref));
  await setDoc(ref, { ...fields, active: false });
  const stopped = env.authenticatedContext('stopped', { email, email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore();
  await assertFails(deleteDoc(doc(stopped, 'workbookInstructors', email)));
  await assertSucceeds(deleteDoc(ref));
  await assertFails(getDocs(collection(stopped, 'workbookParticipants')));
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'workbookInstructors', 'agnes626@hanyang.ac.kr'), { ...fields, email: 'agnes626@hanyang.ac.kr', active: false });
  });
  await assertFails(deleteDoc(doc(owner, 'workbookInstructors', 'agnes626@hanyang.ac.kr')));
});
test('existing experience fields survive profile updates and cannot be read by another student', async () => {
  const db = studentDb('student1'); const ref = doc(db, 'students', 'student1');
  await setDoc(ref, { uid: 'student1', experienceTitle: '기존 제목', experienceSummary: '기존 내용' });
  await assertSucceeds(setDoc(ref, { uid: 'student1', courseId: 'general', nickname: '학생' }, { merge: true }));
  assert.equal((await getDoc(ref)).data().experienceSummary, '기존 내용');
  await assertFails(getDoc(doc(studentDb('student2'), 'students', 'student1')));
});
