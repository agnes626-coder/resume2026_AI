import React, { useEffect, useState } from "react";
import { listCourses, joinCourse, loginInstructor, loginEmailInstructor, registerInstructorAccount, resendInstructorVerification, resetInstructorPassword, loadDashboard, saveCourse, saveInstructor, deleteInstructor, logoutInstructor, courseError } from "./courseService";

const GENERAL = { courseId: "general", courseName: "일반참가용" };
const button = { border: "1px solid #e7ddf7", borderRadius: 12, padding: "12px 16px", cursor: "pointer", background: "#efe7ff", color: "#2f2a37" };
const input = { width: "100%", border: "1px solid #e7ddf7", borderRadius: 12, padding: 12, fontSize: 16, marginTop: 6 };
function EntryField({ label, children }) {
  return <label style={{ display: "block", fontWeight: 700 }}>{label}{children}</label>;
}
function Overlay({ children, wide = false, standalone = false }) {
  return <div style={{ ...(standalone ? { minHeight: "100vh" } : { position: "fixed", inset: 0, zIndex: 9999 }), background: "rgba(64,49,96,.12)", display: "flex", justifyContent: "center", alignItems: standalone ? "flex-start" : "center", padding: 16, color: "#2f2a37", fontFamily: "Pretendard, Apple SD Gothic Neo, sans-serif" }}>
    <section role={standalone ? undefined : "dialog"} aria-modal={standalone ? undefined : "true"} aria-label={wide ? "교수자 관리" : "워크북 입장"} style={{ boxSizing: "border-box", width: "100%", maxWidth: wide ? 760 : 480, maxHeight: standalone ? undefined : "90dvh", overflowY: "auto", borderRadius: 24, padding: 24, background: "#fff", display: "grid", gap: 16 }}>{children}</section>
  </div>;
}

export function CourseEntry({ major, nickname, onMajorChange, onNicknameChange, onEnter, onInstructor }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("general");
  const [accessCode, setAccessCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    listCourses().then(result => { if (active) setCourses(result.courses); })
      .catch(error => { if (active) setNotice(`${courseError(error)} 일반참가용은 브라우저 저장으로 이용할 수 있습니다.`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const submit = async event => {
    event.preventDefault();
    setError("");
    if (!major.trim() || !nickname.trim()) { setError("전공과 닉네임을 입력해주세요."); return; }
    setBusy(true);
    try {
      const result = await joinCourse({ courseId, accessCode: courseId === "general" ? "" : accessCode, major: major.trim(), nickname: nickname.trim() });
      onEnter({ ...result, synced: true });
    } catch (err) {
      if (courseId === "general") {
        onEnter({ ...GENERAL, synced: false });
      } else setError(courseError(err));
    } finally { setBusy(false); }
  };
  return <Overlay>
    <h2 style={{ margin: 0 }}>워크북에 입장하기</h2>
    <p style={{ margin: 0, lineHeight: 1.6 }}>교과목을 선택하고 안내받은 인증번호를 입력하세요. 일반참가용은 코드 없이 입장합니다.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
      <EntryField label="참가 교과목">
        <select style={input} value={courseId} disabled={busy} onChange={event => { setCourseId(event.target.value); setAccessCode(""); setError(""); }}>
          <option value="general">일반참가용 (인증번호 없음)</option>
          {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
      </EntryField>
      {courseId !== "general" && <EntryField label="교과목 인증번호"><input style={input} type="password" autoComplete="off" required value={accessCode} disabled={busy} onChange={event => setAccessCode(event.target.value)} /></EntryField>}
      <EntryField label="전공"><input style={input} required value={major} maxLength={120} disabled={busy} onChange={event => onMajorChange(event.target.value)} /></EntryField>
      <EntryField label="닉네임"><input style={input} required value={nickname} maxLength={80} disabled={busy} onChange={event => onNicknameChange(event.target.value)} /></EntryField>
      {loading && <p role="status">교과목 목록을 불러오는 중입니다.</p>}
      {notice && <p role="status" style={{ margin: 0, color: "#6d6875", lineHeight: 1.6 }}>{notice}</p>}
      {error && <p role="alert" style={{ margin: 0, color: "#a12638" }}>{error}</p>}
      <button style={button} disabled={busy || loading} type="submit">{busy ? "입장 확인 중…" : "시작하기"}</button>
    </form>
    <button style={button} type="button" onClick={onInstructor} disabled={busy}>교수자 로그인 · 교과목 관리</button>
  </Overlay>;
}

export function InstructorConsole({ onClose, standalone = false }) {
  const [instructorEmail, setInstructorEmail] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const run = async task => {
    setBusy(true); setError(""); setNotice("");
    try { await task(); } catch (err) { setError(courseError(err)); }
    finally { setBusy(false); }
  };
  const switchAuthMode = mode => { setAuthMode(mode); setPassword(""); setConfirmPassword(""); setError(""); setNotice(""); };
  const submitEmail = event => {
    event.preventDefault();
    if (authMode === "register" && password !== confirmPassword) { setError("비밀번호 확인이 일치하지 않습니다."); return; }
    run(async () => {
      if (authMode === "reset") {
        await resetInstructorPassword(email);
        setNotice("가입된 이메일이면 비밀번호 재설정 메일이 발송됩니다. 받은 편지함과 스팸함을 확인하세요.");
      } else if (authMode === "register") {
        await registerInstructorAccount({ email, password });
        setAuthMode("login"); setPassword(""); setConfirmPassword("");
        setNotice("인증 메일을 보냈습니다. 받은 편지함과 스팸함을 확인하고 인증 링크를 누른 뒤 로그인하세요. 총괄 관리자가 등록한 이메일만 관리 화면을 이용할 수 있습니다.");
      } else {
        setDashboard(await loginEmailInstructor({ email, password }));
        setPassword(""); setConfirmPassword("");
      }
    });
  };
  const edit = course => { setEditing(course.id); setName(course.name); setCode(""); setActive(course.active); setNotice(""); };
  const save = event => {
    event.preventDefault();
    run(async () => {
      await saveCourse({ id: editing, name: name.trim(), accessCode: code, active });
      setDashboard(await loadDashboard());
      setEditing(null); setName(""); setCode(""); setActive(true);
      setNotice("교과목이 저장되었습니다. 학생에게 교과목명과 인증번호를 안내해주세요.");
    });
  };
  const participants = dashboard ? dashboard.participants.filter(p => filter === "all" || p.courseId === filter) : [];
  return <Overlay wide standalone={standalone}>
    <style>{`* { box-sizing: border-box; } button,input,select { font-family: inherit; }`}</style>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><h2 style={{ margin: 0 }}>교수자 교과목 관리</h2><button style={button} onClick={onClose} disabled={busy}>{standalone ? "워크북으로 돌아가기" : "닫기"}</button></div>
    {!dashboard ? <>
      <p style={{ margin: 0, lineHeight: 1.6 }}>총괄 관리자가 등록한 이메일로 로그인하세요. Google 계정이 없어도 이메일과 비밀번호로 이용할 수 있습니다.</p>
      <button style={button} disabled={busy} onClick={() => run(async () => { setDashboard(await loginInstructor()); setPassword(""); setConfirmPassword(""); })}>Google로 교수자 로그인</button>
      <section style={{ display: "grid", gap: 16, padding: 16, background: "#f8f5ff", borderRadius: 16 }} aria-label="이메일 교수자 로그인">
        <h3 style={{ margin: 0 }}>{authMode === "register" ? "이메일 계정 만들기" : authMode === "reset" ? "비밀번호 재설정" : "이메일로 교수자 로그인"}</h3>
        {authMode === "register" && <p style={{ margin: 0, lineHeight: 1.6 }}>등록된 이메일로 계정을 만들고 인증 메일의 링크를 눌러주세요. 계정 만들기만으로 교수자 권한이 부여되지는 않습니다.</p>}
        {authMode === "reset" && <p style={{ margin: 0, lineHeight: 1.6 }}>계정 이메일로 비밀번호 재설정 링크를 보내드립니다.</p>}
        <form onSubmit={submitEmail} style={{ display: "grid", gap: 12 }}>
          <EntryField label="로그인 이메일"><input style={input} type="email" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></EntryField>
          {authMode !== "reset" && <EntryField label={authMode === "register" ? "비밀번호 (6자 이상)" : "비밀번호"}><input style={input} type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} required minLength={authMode === "register" ? 6 : undefined} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></EntryField>}
          {authMode === "register" && <EntryField label="비밀번호 확인"><input style={input} type="password" autoComplete="new-password" required minLength={6} value={confirmPassword} disabled={busy} onChange={event => setConfirmPassword(event.target.value)} /></EntryField>}
          <button style={button} disabled={busy} type="submit">{authMode === "register" ? "계정 만들고 인증 메일 받기" : authMode === "reset" ? "재설정 메일 받기" : "이메일로 로그인"}</button>
        </form>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {authMode !== "register" && <button style={button} disabled={busy} onClick={() => switchAuthMode("register")}>처음 이용: 계정 만들기</button>}
          {authMode !== "reset" && <button style={button} disabled={busy} onClick={() => switchAuthMode("reset")}>비밀번호 재설정</button>}
          {authMode !== "login" && <button style={button} disabled={busy} onClick={() => switchAuthMode("login")}>이메일 로그인으로 돌아가기</button>}
        </div>
        {authMode === "login" && <button style={button} disabled={busy || !email.trim() || !password} onClick={() => run(async () => {
          const result = await resendInstructorVerification({ email, password });
          setPassword("");
          setNotice(result.alreadyVerified ? "이미 이메일 인증이 완료된 계정입니다. 비밀번호를 입력하고 로그인하세요." : "인증 메일을 다시 보냈습니다. 받은 편지함과 스팸함을 확인하세요.");
        })}>인증 메일 다시 보내기</button>}
      </section>
    </> : <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={button} disabled={busy} onClick={() => run(async () => setDashboard(await loadDashboard()))}>참가 목록 새로고침</button>
        <button style={button} disabled={busy} onClick={() => run(async () => { await logoutInstructor(); setDashboard(null); switchAuthMode("login"); })}>로그아웃</button>
      </div>
      {dashboard.canManageInstructors && <section style={{ display: "grid", gap: 12, padding: 16, background: "#f8f5ff", borderRadius: 16 }}>
        <h3 style={{ margin: 0 }}>교수자 계정 관리</h3>
        <p style={{ margin: 0, lineHeight: 1.6 }}>추가할 교수자의 로그인 이메일을 등록하세요. Google 로그인 또는 이메일·비밀번호 로그인을 이용할 수 있습니다. 이메일 로그인은 교수자가 계정을 만들고 이메일 인증을 완료해야 합니다.</p>
        <form style={{ display: "grid", gap: 10 }} onSubmit={event => { event.preventDefault(); run(async () => { await saveInstructor({ email: instructorEmail.trim(), active: true }); setDashboard(await loadDashboard()); setInstructorEmail(""); setNotice("교수자가 등록되었습니다."); }); }}>
          <EntryField label="추가 교수자 이메일"><input style={input} type="email" required maxLength={254} value={instructorEmail} disabled={busy} onChange={event => setInstructorEmail(event.target.value)} /></EntryField>
          <button style={button} disabled={busy}>교수자 등록</button>
        </form>
        <p style={{ margin: 0, lineHeight: 1.6 }}>접근 중지된 교수자는 목록에서 삭제할 수 있습니다. 삭제 후 다시 허용하려면 이메일을 재등록하세요.</p>
        {dashboard.instructors.map(member => <div key={member.email} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", overflowWrap: "anywhere" }}>
          <span style={{ minWidth: 0 }}>{member.email} · {member.active ? "접근 허용" : "접근 중지"}</span>
          <button style={button} disabled={busy} onClick={() => run(async () => { await saveInstructor({ email: member.email, active: !member.active }); setDashboard(await loadDashboard()); })}>{member.active ? "접근 중지" : "접근 허용"}</button>
          {!member.active && <button style={{ ...button, color: "#a12638" }} disabled={busy} aria-label={`${member.email} 교수자 삭제`} onClick={() => {
            if (!window.confirm(`${member.email}을 교수자 목록에서 삭제하시겠습니까? 다시 허용하려면 이메일을 재등록해야 합니다.`)) return;
            run(async () => { await deleteInstructor(member.email); setDashboard(await loadDashboard()); setNotice("교수자 등록이 삭제되었습니다."); });
          }}>삭제</button>}
        </div>)}
      </section>}
      <h3 style={{ margin: 0 }}>교과목 {editing ? "수정" : "추가"}</h3>
      <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
        <EntryField label="교과목명"><input style={input} value={name} required maxLength={120} disabled={busy} onChange={event => setName(event.target.value)} /></EntryField>
        <EntryField label={editing ? "새 인증번호 (비워두면 기존 번호 유지)" : "인증번호 (4~64자)"}><input style={input} type="password" autoComplete="new-password" value={code} required={!editing} minLength={4} maxLength={64} disabled={busy} onChange={event => setCode(event.target.value)} /></EntryField>
        <label><input type="checkbox" checked={active} disabled={busy} onChange={event => setActive(event.target.checked)} /> 학생 입장 허용</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button style={button} disabled={busy}>교과목 저장</button>{editing && <button style={button} type="button" disabled={busy} onClick={() => { setEditing(null); setName(""); setCode(""); setActive(true); }}>수정 취소</button>}</div>
      </form>
      <div style={{ display: "grid", gap: 8 }}>{dashboard.courses.map(course => <div key={course.id} style={{ padding: 12, background: "#f8f5ff", borderRadius: 12, overflowWrap: "anywhere" }}><strong>{course.name}</strong> · {course.active ? "입장 가능" : "입장 중지"} <button style={button} disabled={busy} onClick={() => edit(course)}>수정</button></div>)}</div>
      <EntryField label="참가자 교과목 필터"><select value={filter} style={input} onChange={event => setFilter(event.target.value)}><option value="all">전체 교과목</option><option value="general">일반참가용</option>{dashboard.courses.map(course => <option value={course.id} key={course.id}>{course.name}</option>)}</select></EntryField>
      <p style={{ margin: 0 }}>참가자 {participants.length}명</p>
      {participants.length === 0 && <p>아직 등록된 참가자가 없습니다.</p>}
      <div style={{ display: "grid", gap: 8 }}>{participants.map(p => <article key={p.id} style={{ padding: 12, border: "1px solid #e7ddf7", borderRadius: 12, overflowWrap: "anywhere" }}><strong>{p.nickname}</strong> · {p.major}<div>{p.courseName}</div><small>최근 입장: {p.updatedAt ? new Date(p.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "기록 없음"}</small></article>)}</div>
    </>}
    {busy && <p role="status">처리 중입니다…</p>}
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" style={{ color: "#a12638" }}>{error}</p>}
  </Overlay>;
}
