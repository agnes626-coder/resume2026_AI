import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { getAuth } from "firebase/auth";

const STORAGE_KEY = "ai_self_intro_full_app_v1";
const STUDENT_LIST_KEY = "ai_self_intro_student_list_v1";
const VISITOR_COUNT_KEY = "ai_self_intro_visitor_count_v1";
const VISITED_SESSION_KEY = "ai_self_intro_session_visited_v1";
const ADMIN_ACCESS_CODE = "flypongpong01";

const steps = [
  { key: "basic", label: "기본 정보", icon: "🎯" },
  { key: "experience", label: "경험 선택", icon: "📌" },
  { key: "star", label: "STAR 정리", icon: "🧠" },
  { key: "competency", label: "역량 추출", icon: "✨" },
  { key: "draft", label: "초안 작성", icon: "✍️" },
  { key: "feedback", label: "AI 첨삭", icon: "🤖" },
  { key: "final", label: "최종본", icon: "🏁" },
];

const defaultData = {
  major: "",
  nickname: "",
  jobTitle: "",
  companyName: "",
  question: "",
  jdText: "",
  experienceTitle: "",
  experienceSummary: "",
  situation: "",
  task: "",
  action: "",
  result: "",
  competencies: "",
  draft: "",
  aiFeedback: "",
  revisedDraft: "",
  finalDraft: "",
  reflection: "",
};

const COLORS = {
  text: "#2f2a37",
  subText: "#6d6875",
  border: "#e7ddf7",
  card: "rgba(255,255,255,0.82)",
  white: "#ffffff",
  primary: "#8b7cf6",
  primaryDark: "#6f5ce7",
  successBg: "#ebfbf5",
  shadow: "rgba(112, 92, 231, 0.12)",
};

const appStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #fde7f3 0%, #efe7ff 52%, #e7f0ff 100%)",
  color: COLORS.text,
  fontFamily:
    "Pretendard, Apple SD Gothic Neo, Noto Sans KR, Segoe UI, sans-serif",
};

const pageStyle = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "28px 18px 42px",
};

const glassCardStyle = {
  background: COLORS.card,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.95)",
  borderRadius: 24,
  boxShadow: `0 20px 50px ${COLORS.shadow}`,
};
export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState(defaultData);
  const [visitorCount, setVisitorCount] = useState(0);
  const [studentList, setStudentList] = useState([]);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultData, ...parsed };
        setData(merged);
        if (!merged.major || !merged.nickname) {
          setShowWelcomeModal(true);
        }
      } else {
        setShowWelcomeModal(true);
      }
    } catch (error) {
      console.error("저장된 데이터를 불러오지 못했습니다.", error);
      setShowWelcomeModal(true);
    }

    try {
      const storedStudents = JSON.parse(
        localStorage.getItem(STUDENT_LIST_KEY) || "[]"
      );
      setStudentList(Array.isArray(storedStudents) ? storedStudents : []);
    } catch (error) {
      console.error("학생 목록을 불러오지 못했습니다.", error);
      setStudentList([]);
    }

    try {
      const hasVisited = sessionStorage.getItem(VISITED_SESSION_KEY);
      const storedCount = Number(
        localStorage.getItem(VISITOR_COUNT_KEY) || "0"
      );

      if (!hasVisited) {
        const nextCount = storedCount + 1;
        localStorage.setItem(VISITOR_COUNT_KEY, String(nextCount));
        sessionStorage.setItem(VISITED_SESSION_KEY, "true");
        setVisitorCount(nextCount);
      } else {
        setVisitorCount(storedCount);
      }
    } catch (error) {
      console.error("접속 수를 불러오지 못했습니다.", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedNotice(true);
      const timer = setTimeout(() => setSavedNotice(false), 1200);
      return () => clearTimeout(timer);
    } catch (error) {
      console.error("데이터를 저장하지 못했습니다.", error);
    }
  }, [data]);

  const updateField = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const registerStudentLocal = (major, nickname) => {
    const nextStudent = {
      major,
      nickname,
      joinedAt: new Date().toLocaleString("ko-KR"),
    };

    setStudentList((prev) => {
      const filtered = prev.filter(
        (item) => !(item.major === major && item.nickname === nickname)
      );
      const nextList = [nextStudent, ...filtered];
      localStorage.setItem(STUDENT_LIST_KEY, JSON.stringify(nextList));
      return nextList;
    });
  };

  const submitWelcomeInfo = async () => {
    const trimmedMajor = data.major.trim();
    const trimmedNickname = data.nickname.trim();

    if (!trimmedMajor || !trimmedNickname) {
      alert("전공과 닉네임을 입력해주세요.");
      return;
    }

    // 로그인 사용자 확인
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    // 1) 화면 동작은 먼저 진행
    setData((prev) => ({
      ...prev,
      major: trimmedMajor,
      nickname: trimmedNickname,
    }));

    registerStudentLocal(trimmedMajor, trimmedNickname);
    setShowWelcomeModal(false);

    // 2) Firebase 저장
    try {
      await setDoc(
        doc(db, "students", user.uid),
        {
          uid: user.uid,
          major: trimmedMajor,
          nickname: trimmedNickname,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("학생 프로필이 저장되었습니다.");
    } catch (error) {
      console.error("학생 프로필 저장 실패:", error);
      alert("학생 프로필 저장 중 오류가 발생했습니다.");
    }
  }; // ← submitWelcomeInfo 함수 종료

  const openAdminModal = () => {
    if (!isAdmin) {
      const input = window.prompt("관리자 코드를 입력하세요.");

      if (input === null) return;

      if (input !== ADMIN_ACCESS_CODE) {
        alert("관리자 코드가 올바르지 않습니다.");
        return;
      }

      setIsAdmin(true);
    }

    setShowAdminModal(true);
  };

  const resetAll = () => {
    const ok = window.confirm("입력한 내용을 모두 초기화할까요?");

    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    setData(defaultData);
    setCurrentStep(0);
    setShowWelcomeModal(true);
  };

  const downloadText = () => {
    const content = `AI 기반 자기소개서 워크북

[사용자 정보]
전공: ${data.major}
닉네임: ${data.nickname}

[기본 정보]
지원 직무: ${data.jobTitle}
기업명: ${data.companyName}
문항: ${data.question}
채용공고/JD: ${data.jdText}

[경험 선택]
경험 제목: ${data.experienceTitle}
경험 요약: ${data.experienceSummary}

[STAR]
Situation: ${data.situation}
Task: ${data.task}
Action: ${data.action}
Result: ${data.result}

[역량 추출]
${data.competencies}

[초안]
${data.draft}

[AI 첨삭]
${data.aiFeedback}

[수정본]
${data.revisedDraft}

[최종본]
${data.finalDraft}

[점검 메모]
${data.reflection}`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "자기소개서_워크북.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocx = async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "AI 기반 자기소개서 워크북",
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph(""),
            new Paragraph(`[사용자 정보]`),
            new Paragraph(`전공: ${data.major}`),
            new Paragraph(`닉네임: ${data.nickname}`),
            new Paragraph(""),
            new Paragraph(`[기본 정보]`),
            new Paragraph(`지원 직무: ${data.jobTitle}`),
            new Paragraph(`기업명: ${data.companyName}`),
            new Paragraph(`문항: ${data.question}`),
            new Paragraph(`채용공고/JD: ${data.jdText}`),
            new Paragraph(""),
            new Paragraph(`[경험 선택]`),
            new Paragraph(`경험 제목: ${data.experienceTitle}`),
            new Paragraph(`경험 요약: ${data.experienceSummary}`),
            new Paragraph(""),
            new Paragraph(`[STAR]`),
            new Paragraph(`Situation: ${data.situation}`),
            new Paragraph(`Task: ${data.task}`),
            new Paragraph(`Action: ${data.action}`),
            new Paragraph(`Result: ${data.result}`),
            new Paragraph(""),
            new Paragraph(`[역량 추출]`),
            new Paragraph(data.competencies || ""),
            new Paragraph(""),
            new Paragraph(`[초안]`),
            new Paragraph(data.draft || ""),
            new Paragraph(""),
            new Paragraph(`[AI 첨삭]`),
            new Paragraph(data.aiFeedback || ""),
            new Paragraph(""),
            new Paragraph(`[수정본]`),
            new Paragraph(data.revisedDraft || ""),
            new Paragraph(""),
            new Paragraph(`[최종본]`),
            new Paragraph(data.finalDraft || ""),
            new Paragraph(""),
            new Paragraph(`[점검 메모]`),
            new Paragraph(data.reflection || ""),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "자기소개서_워크북.docx");
  };

  const escapeHtml = (text = "") => {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
      .replaceAll("\n", "<br />");
  };

  const downloadPdf = () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>자기소개서 워크북</title>
          <style>
            body {
              font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
              padding: 32px;
              line-height: 1.7;
              color: #222;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 24px;
            }
            h2 {
              font-size: 17px;
              margin-top: 28px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 6px;
            }
            p {
              font-size: 13px;
              margin: 8px 0;
            }
            @media print {
              body {
                padding: 20mm;
              }
            }
          </style>
        </head>
        <body>
          <h1>AI 기반 자기소개서 워크북</h1>
  
          <h2>사용자 정보</h2>
          <p><strong>전공:</strong> ${escapeHtml(data.major)}</p>
          <p><strong>닉네임:</strong> ${escapeHtml(data.nickname)}</p>
  
          <h2>기본 정보</h2>
          <p><strong>지원 직무:</strong> ${escapeHtml(data.jobTitle)}</p>
          <p><strong>기업명:</strong> ${escapeHtml(data.companyName)}</p>
          <p><strong>문항:</strong><br />${escapeHtml(data.question)}</p>
          <p><strong>채용공고/JD:</strong><br />${escapeHtml(data.jdText)}</p>
  
          <h2>경험 선택</h2>
          <p><strong>경험 제목:</strong> ${escapeHtml(data.experienceTitle)}</p>
          <p><strong>경험 요약:</strong><br />${escapeHtml(
            data.experienceSummary
          )}</p>
  
          <h2>STAR</h2>
          <p><strong>Situation:</strong><br />${escapeHtml(data.situation)}</p>
          <p><strong>Task:</strong><br />${escapeHtml(data.task)}</p>
          <p><strong>Action:</strong><br />${escapeHtml(data.action)}</p>
          <p><strong>Result:</strong><br />${escapeHtml(data.result)}</p>
  
          <h2>역량 추출</h2>
          <p>${escapeHtml(data.competencies)}</p>
  
          <h2>초안</h2>
          <p>${escapeHtml(data.draft)}</p>
  
          <h2>AI 첨삭</h2>
          <p>${escapeHtml(data.aiFeedback)}</p>
  
          <h2>수정본</h2>
          <p>${escapeHtml(data.revisedDraft)}</p>
  
          <h2>최종본</h2>
          <p>${escapeHtml(data.finalDraft)}</p>
  
          <h2>점검 메모</h2>
          <p>${escapeHtml(data.reflection)}</p>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const completedCount = useMemo(() => {
    const items = [
      Boolean(data.major && data.nickname && data.jobTitle && data.question),
      Boolean(data.experienceTitle && data.experienceSummary),
      Boolean(data.situation && data.task && data.action && data.result),
      Boolean(data.competencies),
      Boolean(data.draft),
      Boolean(data.aiFeedback && data.revisedDraft),
      Boolean(data.finalDraft),
    ];
    return items.filter(Boolean).length;
  }, [data]);

  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const finalCharCount = useMemo(
    () => data.finalDraft.replace(/\s/g, "").length,
    [data.finalDraft]
  );

  const promptExperience = `아래 경험을 읽고, 자기소개서에서 강조할 수 있는 핵심 역량 3가지를 정리해줘.
각 역량마다 근거가 되는 행동도 함께 설명해줘.

전공: ${data.major || "[전공 입력]"}
닉네임: ${data.nickname || "[닉네임 입력]"}
지원 직무: ${data.jobTitle || "[지원 직무 입력]"}
기업명: ${data.companyName || "[기업명 입력]"}
문항: ${data.question || "[자기소개서 문항 입력]"}
경험 제목: ${data.experienceTitle || "[경험 제목 입력]"}
경험 요약: ${data.experienceSummary || "[경험 요약 입력]"}
Situation: ${data.situation || "[상황 입력]"}
Task: ${data.task || "[과제 입력]"}
Action: ${data.action || "[행동 입력]"}
Result: ${data.result || "[결과 입력]"}`;

  const promptDraft = `아래 정보를 바탕으로 자기소개서 초안을 작성해줘.
조건: 과장 없이, 구체적인 행동과 결과 중심으로 작성하고, 추상적인 표현은 줄여줘.

전공: ${data.major || "[전공 입력]"}
닉네임: ${data.nickname || "[닉네임 입력]"}
지원 직무: ${data.jobTitle || "[지원 직무 입력]"}
기업명: ${data.companyName || "[기업명 입력]"}
문항: ${data.question || "[자기소개서 문항 입력]"}
채용공고/JD: ${data.jdText || "[채용공고 입력]"}
경험 제목: ${data.experienceTitle || "[경험 제목 입력]"}
Situation: ${data.situation || "[상황 입력]"}
Task: ${data.task || "[과제 입력]"}
Action: ${data.action || "[행동 입력]"}
Result: ${data.result || "[결과 입력]"}
강조 역량: ${data.competencies || "[역량 입력]"}`;

  const promptFeedback = `다음 자기소개서 초안을 인사담당자 관점에서 평가해줘.
1) 논리성
2) 구체성
3) 직무 적합성
4) 클리셰 표현
의 4가지 기준으로 피드백하고, 마지막에 수정 방향을 제안해줘.

지원 직무: ${data.jobTitle || "[지원 직무 입력]"}
기업명: ${data.companyName || "[기업명 입력]"}
문항: ${data.question || "[문항 입력]"}
채용공고/JD: ${data.jdText || "[채용공고 입력]"}
초안: ${data.draft || "[초안 입력]"}`;

  const promptRewrite = `다음 자기소개서 수정본을 참고해서, 사실관계를 바꾸지 말고 더 자연스럽고 내 언어처럼 보이게 다듬어줘.
금지: 없는 경험 추가, 과장, 추상적 미사여구.

지원 직무: ${data.jobTitle || "[지원 직무 입력]"}
문항: ${data.question || "[문항 입력]"}
수정본: ${data.revisedDraft || "[수정본 입력]"}`;

  return (
    <div style={appStyle}>
      <style>{globalCss}</style>

      {showWelcomeModal && (
        <WelcomeModal
          major={data.major}
          nickname={data.nickname}
          onMajorChange={(value) => updateField("major", value)}
          onNicknameChange={(value) => updateField("nickname", value)}
          onSubmit={submitWelcomeInfo}
        />
      )}

      {showAdminModal && (
        <AdminStudentListModal
          studentList={studentList}
          onClose={() => setShowAdminModal(false)}
        />
      )}

      <div style={pageStyle}>
        <Header
          completedCount={completedCount}
          progressPercent={progressPercent}
          visitorCount={visitorCount}
          major={data.major}
          nickname={data.nickname}
          onDownloadText={downloadText}
          onDownloadDocx={downloadDocx}
          onDownloadPdf={downloadPdf}
          onReset={resetAll}
          onOpenAdmin={openAdminModal}
          savedNotice={savedNotice}
        />

        <div style={styles.stepRow}>
          {steps.map((step, index) => (
            <StepChip
              key={step.key}
              label={step.label}
              icon={step.icon}
              index={index}
              active={currentStep === index}
              done={index < completedCount}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        <div style={styles.mainGrid}>
          <div style={styles.leftColumn}>
            {currentStep === 0 && (
              <SectionCard
                title="1단계. 기본 정보 입력"
                description="전공, 닉네임, 지원 직무와 문항을 먼저 정리하면 이후 AI 결과의 품질이 좋아집니다."
                tip="먼저 직무와 문항을 분명하게 써두면 프롬프트 정확도가 높아집니다."
                icon="🎯"
              >
                <Field
                  label="전공"
                  value={data.major}
                  onChange={(value) => updateField("major", value)}
                  placeholder="예: 경영학과, 심리학과, 컴퓨터공학과"
                />
                <Field
                  label="닉네임"
                  value={data.nickname}
                  onChange={(value) => updateField("nickname", value)}
                  placeholder="앱에서 사용할 이름을 입력하세요"
                />
                <Field
                  label="지원 직무"
                  value={data.jobTitle}
                  onChange={(value) => updateField("jobTitle", value)}
                  placeholder="예: 마케팅, 인사, 데이터분석, 영업관리"
                />
                <Field
                  label="기업명"
                  value={data.companyName}
                  onChange={(value) => updateField("companyName", value)}
                  placeholder="예: 삼성전자, 네이버, CJ제일제당"
                />
                <Field
                  label="자기소개서 문항"
                  value={data.question}
                  onChange={(value) => updateField("question", value)}
                  placeholder="예: 지원 직무를 위해 준비한 경험과 강점을 작성하시오."
                  textarea
                  rows={4}
                />
                <Field
                  label="채용공고 / JD"
                  value={data.jdText}
                  onChange={(value) => updateField("jdText", value)}
                  placeholder="채용공고 주요 내용이나 직무 요구 역량을 붙여 넣으세요."
                  textarea
                  rows={10}
                />
              </SectionCard>
            )}

            {currentStep === 1 && (
              <SectionCard
                title="2단계. 경험 선택"
                description="단순 활동이 아니라, 내가 한 행동과 문제해결 과정이 드러나는 경험을 골라보세요."
                tip="좋은 경험은 결과보다 행동을 설명하기 쉬운 경험입니다."
                icon="📌"
              >
                <Field
                  label="경험 제목"
                  value={data.experienceTitle}
                  onChange={(value) => updateField("experienceTitle", value)}
                  placeholder="예: 교내 마케팅 프로젝트, 캡스톤디자인, 인턴십"
                />
                <Field
                  label="경험 요약"
                  value={data.experienceSummary}
                  onChange={(value) => updateField("experienceSummary", value)}
                  placeholder="이 경험에서 무슨 문제를 마주했고, 내가 무엇을 했는지 3~5문장으로 요약해보세요."
                  textarea
                  rows={8}
                  help="체크 질문: 문제 상황이 있었는가? 내가 한 행동을 설명할 수 있는가? 지원 직무와 연결 가능한가?"
                />
              </SectionCard>
            )}

            {currentStep === 2 && (
              <SectionCard
                title="3단계. STAR 정리"
                description="상황-과제-행동-결과를 나누어 쓰면 자기소개서 내용이 훨씬 선명해집니다."
                tip="특히 Action은 가장 자세하게 적어주세요. 어떤 방식으로 해결했는지가 핵심입니다."
                icon="🧠"
              >
                <Field
                  label="Situation (상황)"
                  value={data.situation}
                  onChange={(value) => updateField("situation", value)}
                  placeholder="예: 팀 프로젝트 진행 중 일정 지연과 역할 충돌이 발생함"
                  textarea
                  rows={4}
                />
                <Field
                  label="Task (과제)"
                  value={data.task}
                  onChange={(value) => updateField("task", value)}
                  placeholder="예: 기획 파트를 맡아 일정 재정비와 팀 내 합의 도출이 필요했음"
                  textarea
                  rows={4}
                />
                <Field
                  label="Action (행동)"
                  value={data.action}
                  onChange={(value) => updateField("action", value)}
                  placeholder="예: 우선순위를 재설정하고, 팀원 의견을 분류해 회의 구조를 다시 설계함"
                  textarea
                  rows={6}
                />
                <Field
                  label="Result (결과)"
                  value={data.result}
                  onChange={(value) => updateField("result", value)}
                  placeholder="예: 일정 지연을 줄였고, 발표 평가에서 상위 점수를 받음"
                  textarea
                  rows={4}
                />
              </SectionCard>
            )}

            {currentStep === 3 && (
              <SectionCard
                title="4단계. 역량 추출"
                description="아래 프롬프트를 복사해 AI에 넣고, 정리된 역량을 다시 이 앱에 기록하세요."
                tip="AI가 제안한 역량 중 실제 경험으로 입증 가능한 것만 남기는 것이 중요합니다."
                icon="✨"
              >
                <PromptBox
                  title="역량 추출 프롬프트"
                  prompt={promptExperience}
                />
                <Field
                  label="AI가 정리한 핵심 역량"
                  value={data.competencies}
                  onChange={(value) => updateField("competencies", value)}
                  placeholder="예: 데이터 기반 문제해결, 협업 조율, 실행력"
                  textarea
                  rows={10}
                />
              </SectionCard>
            )}

            {currentStep === 4 && (
              <SectionCard
                title="5단계. 초안 작성"
                description="역량과 STAR 내용을 바탕으로 자기소개서 초안을 생성하고 저장하세요."
                tip="처음부터 완벽할 필요는 없습니다. 먼저 구조가 살아 있는 초안을 만드는 것이 중요합니다."
                icon="✍️"
              >
                <PromptBox title="초안 생성 프롬프트" prompt={promptDraft} />
                <Field
                  label="AI 초안 또는 내가 작성한 초안"
                  value={data.draft}
                  onChange={(value) => updateField("draft", value)}
                  placeholder="AI가 생성한 초안 또는 직접 작성한 초안을 붙여 넣으세요."
                  textarea
                  rows={14}
                />
              </SectionCard>
            )}

            {currentStep === 5 && (
              <SectionCard
                title="6단계. AI 첨삭"
                description="초안을 평가받고, 수정 방향을 반영한 새 버전을 남겨보세요."
                tip="AI 결과를 그대로 쓰지 말고, 어떤 점이 좋아졌는지 먼저 판단한 뒤 반영하세요."
                icon="🤖"
              >
                <PromptBox title="AI 피드백 프롬프트" prompt={promptFeedback} />
                <Field
                  label="AI 피드백"
                  value={data.aiFeedback}
                  onChange={(value) => updateField("aiFeedback", value)}
                  placeholder="논리성, 구체성, 직무 적합성, 클리셰 표현에 대한 피드백을 붙여 넣으세요."
                  textarea
                  rows={12}
                />
                <Field
                  label="피드백 반영 수정본"
                  value={data.revisedDraft}
                  onChange={(value) => updateField("revisedDraft", value)}
                  placeholder="AI 피드백을 바탕으로 수정한 버전을 적으세요."
                  textarea
                  rows={12}
                />
              </SectionCard>
            )}

            {currentStep === 6 && (
              <SectionCard
                title="7단계. 최종본 정리"
                description="내 언어로 다시 다듬고, 최종 제출 전 점검 메모도 남겨보세요."
                tip="마지막에는 꼭 소리 내어 읽어보며 내 어조와 사실관계를 확인하세요."
                icon="🏁"
              >
                <PromptBox
                  title="자연스럽게 다듬기 프롬프트"
                  prompt={promptRewrite}
                />
                <Field
                  label="최종 자기소개서"
                  value={data.finalDraft}
                  onChange={(value) => updateField("finalDraft", value)}
                  placeholder="최종 제출용 문안을 정리하세요."
                  textarea
                  rows={15}
                />
                <div style={styles.counterBox}>
                  현재 글자 수(공백 제외): {finalCharCount}
                </div>
                <Field
                  label="최종 점검 메모"
                  value={data.reflection}
                  onChange={(value) => updateField("reflection", value)}
                  placeholder="어색한 표현, 수정이 필요한 지점, 교수 피드백 등을 기록하세요."
                  textarea
                  rows={6}
                />
              </SectionCard>
            )}

            <div style={styles.navRow}>
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                style={styles.secondaryButton}
              >
                이전 단계
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))
                }
                style={styles.primaryButton}
              >
                다음 단계
              </button>
            </div>
          </div>

          <div style={styles.rightColumn}>
            <SidebarCard title="사용자 정보" icon="👤">
              <InfoRow label="전공" value={data.major || "미입력"} />
              <InfoRow label="닉네임" value={data.nickname || "미입력"} />
              <div style={styles.noticeBox}>
                현재 접속 표시 {visitorCount}명은 이 기기 브라우저 기준 누적
                표시입니다.
              </div>
            </SidebarCard>

            <SidebarCard title="진행 현황" icon="📊">
              <ProgressBar percent={progressPercent} />
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 13,
                  color: COLORS.subText,
                }}
              >
                {completedCount} / {steps.length} 단계 완료
              </p>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <ProgressItem
                  label="기본 정보"
                  done={Boolean(
                    data.major &&
                      data.nickname &&
                      data.jobTitle &&
                      data.question
                  )}
                />
                <ProgressItem
                  label="경험 선택"
                  done={Boolean(data.experienceTitle && data.experienceSummary)}
                />
                <ProgressItem
                  label="STAR 정리"
                  done={Boolean(
                    data.situation && data.task && data.action && data.result
                  )}
                />
                <ProgressItem
                  label="역량 추출"
                  done={Boolean(data.competencies)}
                />
                <ProgressItem label="초안 작성" done={Boolean(data.draft)} />
                <ProgressItem
                  label="AI 첨삭"
                  done={Boolean(data.aiFeedback && data.revisedDraft)}
                />
                <ProgressItem label="최종본" done={Boolean(data.finalDraft)} />
              </div>
            </SidebarCard>

            <SidebarCard title="작성 팁" icon="💡">
              <TipItem
                emoji="🎯"
                text="좋은 경험은 결과보다 행동이 설명되는 경험입니다."
              />
              <TipItem
                emoji="🧠"
                text="문항, 직무, JD를 함께 주면 AI 결과가 더 정확해집니다."
              />
              <TipItem
                emoji="✍️"
                text="추상 표현 대신 행동과 수치, 장면을 드러내는 문장을 쓰세요."
              />
              <TipItem
                emoji="🔎"
                text="AI 결과는 반드시 사실관계와 내 어조에 맞게 점검하세요."
              />
            </SidebarCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeModal({
  major,
  nickname,
  onMajorChange,
  onNicknameChange,
  onSubmit,
}) {
  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...glassCardStyle, ...styles.modalCard }}>
        <div style={styles.modalEmoji}>👋</div>
        <h2 style={styles.modalTitle}>시작하기 전에 알려주세요</h2>
        <p style={styles.modalDesc}>
          앱 사용을 위해 전공과 닉네임을 먼저 입력해주세요.
        </p>
        <Field
          label="전공"
          value={major}
          onChange={onMajorChange}
          placeholder="예: 경영학과, 심리학과, 컴퓨터공학과"
        />
        <Field
          label="닉네임"
          value={nickname}
          onChange={onNicknameChange}
          placeholder="앱에서 사용할 이름을 입력하세요"
        />
        <button
          type="button"
          onClick={onSubmit}
          style={{ ...styles.primaryButton, width: "100%", marginTop: 8 }}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}

function AdminStudentListModal({ studentList, onClose }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...glassCardStyle, ...styles.adminModalCard }}>
        <div style={styles.adminModalHeader}>
          <div>
            <div style={styles.adminModalTitle}>관리자 전용 학생 참여 목록</div>
            <div style={styles.adminModalSubTitle}>
              닉네임, 전공, 입력 시각을 확인할 수 있습니다.
            </div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeButton}>
            닫기
          </button>
        </div>

        {studentList.length === 0 ? (
          <div style={styles.emptyStudentBox}>아직 등록된 학생이 없습니다.</div>
        ) : (
          <div style={styles.studentListWrap}>
            {studentList.map((student, index) => (
              <div
                key={`${student.nickname}-${student.major}-${index}`}
                style={styles.studentItem}
              >
                <div style={styles.studentTopRow}>
                  <span style={styles.studentNickname}>{student.nickname}</span>
                  <span style={styles.studentMajor}>{student.major}</span>
                </div>
                <div style={styles.studentJoinedAt}>
                  입력 시각: {student.joinedAt}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({
  completedCount,
  progressPercent,
  visitorCount,
  major,
  nickname,
  onDownloadText,
  onDownloadDocx,
  onDownloadPdf,
  onReset,
  onOpenAdmin,
  savedNotice,
}) {
  return (
    <div style={{ ...glassCardStyle, padding: 24, marginBottom: 18 }}>
      <div style={styles.headerTop}>
        <div>
          <div style={styles.kickerRow}>
            <span style={styles.kicker}>AI 기반 자기소개서 완성 전략</span>
            <span style={styles.visitorBadge}>
              현재 접속 표시: {visitorCount}명
            </span>
          </div>
          <h1 style={styles.mainTitle}>학생 실습용 자기소개서 워크북 앱</h1>
          <p style={styles.mainDesc}>
            경험을 구조화하고, AI와 함께 초안 작성부터 첨삭, 최종 재작성까지
            진행할 수 있는 단계형 웹앱입니다.
          </p>
          {(major || nickname) && (
            <div style={styles.tagRow}>
              {major ? <span style={styles.infoTag}>전공: {major}</span> : null}
              {nickname ? (
                <span style={styles.infoTagBlue}>닉네임: {nickname}</span>
              ) : null}
            </div>
          )}
        </div>
        <div style={styles.headerButtons}>
          <button
            type="button"
            onClick={onDownloadText}
            style={styles.secondaryButton}
          >
            📄 TXT 다운로드
          </button>

          <button
            type="button"
            onClick={onDownloadDocx}
            style={styles.secondaryButton}
          >
            📝 DOCX 다운로드
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            style={styles.secondaryButton}
          >
            📑 PDF 다운로드
          </button>
          <button type="button" onClick={onReset} style={styles.primaryButton}>
            전체 초기화
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            style={styles.adminButton}
          >
            관리자 학생 목록
          </button>
        </div>
      </div>
      <div style={styles.headerBottom}>
        <div style={styles.headerStatBox}>
          <div style={styles.headerStatLabel}>진행률</div>
          <div style={styles.headerStatValue}>{progressPercent}%</div>
        </div>
        <div style={styles.headerStatBox}>
          <div style={styles.headerStatLabel}>완료 단계</div>
          <div style={styles.headerStatValue}>{completedCount} / 7</div>
        </div>
        <div style={styles.saveNoticeBox}>
          {savedNotice ? "💾 자동 저장됨" : "입력 내용이 브라우저에 저장됩니다"}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, description, tip, icon, children }) {
  return (
    <div style={{ ...glassCardStyle, padding: 28 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={styles.sectionTitleRow}>
          <span style={styles.sectionIconBubble}>{icon}</span>
          <div style={styles.sectionTitle}>{title}</div>
        </div>
        <p style={styles.sectionDescription}>{description}</p>
        {tip ? <div style={styles.tipBanner}>✨ {tip}</div> : null}
      </div>
      <div style={{ display: "grid", gap: 18 }}>{children}</div>
    </div>
  );
}

function SidebarCard({ title, icon, children }) {
  return (
    <div style={{ ...glassCardStyle, padding: 20 }}>
      <div style={styles.sidebarTitleRow}>
        <span style={styles.sidebarIconBubble}>{icon}</span>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
  rows = 4,
  help,
}) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {help ? <div style={styles.helpText}>{help}</div> : null}
      {textarea ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={styles.textarea}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={styles.input}
        />
      )}
    </div>
  );
}

function PromptBox({ title, prompt }) {
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      alert("프롬프트를 복사했습니다.");
    } catch {
      alert("복사에 실패했습니다.");
    }
  };

  return (
    <div style={styles.promptBox}>
      <div style={styles.promptHeader}>
        <div style={styles.promptTitle}>{title}</div>
        <button type="button" onClick={copyPrompt} style={styles.copyButton}>
          복사
        </button>
      </div>
      <pre style={styles.promptText}>{prompt}</pre>
    </div>
  );
}

function StepChip({ label, icon, index, active, done, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.stepChip,
        ...(active ? styles.stepChipActive : {}),
        ...(!active && done ? styles.stepChipDone : {}),
      }}
    >
      <span style={styles.stepIconWrap}>{icon}</span>
      <span style={styles.stepTextWrap}>
        <span style={styles.stepNumber}>{index + 1}단계</span>
        <span>{label}</span>
      </span>
    </button>
  );
}

function ProgressBar({ percent }) {
  return (
    <div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${percent}%` }} />
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: COLORS.primaryDark,
          marginTop: 8,
        }}
      >
        {percent}%
      </div>
    </div>
  );
}

function ProgressItem({ label, done }) {
  return (
    <div style={styles.progressItem}>
      <span>{label}</span>
      <span
        style={{
          ...styles.progressBadge,
          ...(done ? styles.progressBadgeDone : {}),
        }}
      >
        {done ? "완료" : "미완료"}
      </span>
    </div>
  );
}

function TipItem({ emoji, text }) {
  return (
    <div style={styles.tipItem}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(64, 49, 96, 0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 9999,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    padding: 28,
    display: "grid",
    gap: 16,
  },
  adminModalCard: {
    width: "100%",
    maxWidth: 720,
    padding: 28,
    display: "grid",
    gap: 16,
    maxHeight: "80vh",
    overflow: "auto",
  },
  modalEmoji: { fontSize: 42, textAlign: "center" },
  modalTitle: { margin: 0, fontSize: 28, fontWeight: 800, textAlign: "center" },
  modalDesc: {
    margin: 0,
    textAlign: "center",
    color: COLORS.subText,
    lineHeight: 1.6,
  },
  adminModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  adminModalTitle: { fontSize: 24, fontWeight: 800 },
  adminModalSubTitle: { fontSize: 13, color: COLORS.subText, marginTop: 6 },
  closeButton: {
    border: `1px solid ${COLORS.border}`,
    background: "rgba(255,255,255,0.88)",
    color: COLORS.text,
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  kickerRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 10,
  },
  kicker: {
    display: "inline-block",
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.primaryDark,
    background: "rgba(255,255,255,0.75)",
    padding: "8px 12px",
    borderRadius: 999,
  },
  visitorBadge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 800,
    color: "#c24f80",
    background: "#ffe4ef",
    padding: "8px 12px",
    borderRadius: 999,
  },
  tagRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 },
  infoTag: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.primaryDark,
    background: "#efe7ff",
    padding: "8px 12px",
    borderRadius: 999,
  },
  infoTagBlue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#4162b7",
    background: "#e7f0ff",
    padding: "8px 12px",
    borderRadius: 999,
  },
  mainTitle: { margin: 0, fontSize: 34, lineHeight: 1.2 },
  mainDesc: {
    margin: "12px 0 0",
    fontSize: 15,
    lineHeight: 1.7,
    color: COLORS.subText,
    maxWidth: 700,
  },
  headerButtons: { display: "flex", gap: 10, flexWrap: "wrap" },
  primaryButton: {
    border: "none",
    background: "linear-gradient(135deg, #9a8cff 0%, #ff9dc9 100%)",
    color: "white",
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: `1px solid ${COLORS.border}`,
    background: "rgba(255,255,255,0.88)",
    color: COLORS.text,
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  adminButton: {
    border: `1px solid ${COLORS.border}`,
    background: "#fff4dc",
    color: "#9b6a00",
    borderRadius: 16,
    padding: "14px 18px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  headerBottom: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 20,
  },
  headerStatBox: {
    background: "rgba(255,255,255,0.6)",
    borderRadius: 18,
    padding: "16px 18px",
    border: `1px solid ${COLORS.white}`,
  },
  headerStatLabel: { fontSize: 12, color: COLORS.subText, marginBottom: 6 },
  headerStatValue: { fontSize: 24, fontWeight: 800 },
  saveNoticeBox: {
    background: COLORS.successBg,
    borderRadius: 18,
    padding: "16px 18px",
    border: "1px solid rgba(53,181,138,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    color: "#277b60",
    minHeight: 58,
  },
  stepRow: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  stepChip: {
    border: `1px solid ${COLORS.border}`,
    background: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    padding: "11px 14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: COLORS.text,
  },
  stepChipActive: {
    background:
      "linear-gradient(135deg, rgba(155,124,246,0.18) 0%, rgba(255,157,201,0.18) 100%)",
  },
  stepChipDone: { background: COLORS.successBg },
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "rgba(255,255,255,0.85)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  stepTextWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    fontSize: 14,
    fontWeight: 700,
  },
  stepNumber: { fontSize: 11, color: COLORS.subText, fontWeight: 700 },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 0.9fr)",
    gap: 18,
    alignItems: "start",
  },
  leftColumn: { display: "grid", gap: 16 },
  rightColumn: { display: "grid", gap: 16, position: "sticky", top: 16 },
  sectionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  sectionIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 14,
    background: "rgba(255,255,255,0.9)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  sectionTitle: { fontSize: 28, fontWeight: 800 },
  sectionDescription: {
    margin: 0,
    color: COLORS.subText,
    lineHeight: 1.7,
    fontSize: 15,
  },
  tipBanner: {
    marginTop: 12,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(239,231,255,0.85) 100%)",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primaryDark,
  },
  label: { display: "block", fontSize: 14, fontWeight: 800, marginBottom: 8 },
  helpText: {
    fontSize: 12,
    lineHeight: 1.6,
    color: COLORS.subText,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 18,
    border: `1px solid ${COLORS.border}`,
    background: "rgba(255,255,255,0.92)",
    padding: "15px 16px",
    fontSize: 14,
    outline: "none",
    color: COLORS.text,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 18,
    border: `1px solid ${COLORS.border}`,
    background: "rgba(255,255,255,0.92)",
    padding: "15px 16px",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    color: COLORS.text,
    lineHeight: 1.65,
  },
  promptBox: {
    borderRadius: 20,
    padding: 18,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(239,231,255,0.82) 100%)",
    border: `1px dashed ${COLORS.border}`,
  },
  promptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  promptTitle: { fontSize: 14, fontWeight: 800 },
  copyButton: {
    border: `1px solid ${COLORS.border}`,
    background: "rgba(255,255,255,0.92)",
    color: COLORS.text,
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  promptText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 13,
    lineHeight: 1.7,
    color: COLORS.subText,
    fontFamily: "inherit",
  },
  counterBox: {
    borderRadius: 16,
    padding: "14px 16px",
    fontSize: 14,
    fontWeight: 800,
    background:
      "linear-gradient(135deg, rgba(231,240,255,0.88) 0%, rgba(239,231,255,0.9) 100%)",
  },
  navRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  sidebarTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sidebarIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "rgba(255,255,255,0.9)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  },
  progressTrack: {
    width: "100%",
    height: 14,
    borderRadius: 999,
    background: "rgba(255,255,255,0.7)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #9a8cff 0%, #ff9dc9 100%)",
  },
  progressItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: "11px 12px",
    background: "rgba(255,255,255,0.62)",
  },
  progressBadge: {
    fontSize: 12,
    fontWeight: 800,
    color: COLORS.subText,
    background: "#f8f5ff",
    padding: "6px 10px",
    borderRadius: 999,
  },
  progressBadgeDone: { background: COLORS.successBg, color: "#277b60" },
  tipItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 0",
    borderBottom: "1px dashed rgba(109,104,117,0.18)",
    lineHeight: 1.65,
    fontSize: 14,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: "11px 12px",
    background: "rgba(255,255,255,0.62)",
    marginBottom: 10,
  },
  noticeBox: {
    borderRadius: 14,
    padding: "12px 12px",
    background: "#fff4dc",
    color: "#9b6a00",
    fontSize: 12,
    lineHeight: 1.6,
  },
  emptyStudentBox: {
    borderRadius: 14,
    padding: "14px 12px",
    background: "rgba(255,255,255,0.62)",
    color: COLORS.subText,
    fontSize: 13,
  },
  studentListWrap: { display: "grid", gap: 10 },
  studentItem: {
    borderRadius: 14,
    padding: "12px 12px",
    background: "rgba(255,255,255,0.62)",
  },
  studentTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  studentNickname: { fontWeight: 800, fontSize: 14 },
  studentMajor: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.primaryDark,
    background: "#efe7ff",
    padding: "6px 8px",
    borderRadius: 999,
  },
  studentJoinedAt: { fontSize: 12, color: COLORS.subText },
};

const globalCss = `
  * { box-sizing: border-box; }
  button, input, textarea { font-family: inherit; }
  input::placeholder, textarea::placeholder { color: #a89fb7; }
  input:focus, textarea:focus {
    border-color: #b9acf9 !important;
    box-shadow: 0 0 0 4px rgba(155,124,246,0.12);
  }
  @media (max-width: 920px) {
    div[style*="grid-template-columns: repeat(3"] {
      grid-template-columns: 1fr !important;
    }
  }
`;
