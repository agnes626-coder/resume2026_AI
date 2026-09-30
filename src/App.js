import React, { useEffect, useMemo, useState, useId } from "react";
import "./firebase";
import { CourseEntry } from "./CourseEntry";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { normalizeWorkbook, updateWorkbookField, updateQuestion, editQuestion, selectQuestion, addQuestion, removeQuestion, workbookSections, workbookText, characterCount, draftTarget, lengthInstruction } from "./questionWorkbooks";

import { buildDraftPrompt } from "./workbookPrompts";

const STORAGE_KEY = "ai_self_intro_full_app_v1";
const STUDENT_LIST_KEY = "ai_self_intro_student_list_v1";
const VISITOR_COUNT_KEY = "ai_self_intro_visitor_count_v1";
const VISITED_SESSION_KEY = "ai_self_intro_session_visited_v1";

const steps = [
  { key: "basic", label: "지원정보·문항 설정", icon: "🎯" },
  { key: "experience", label: "면접관의 시선으로 경험 탐색", icon: "📌" },
  { key: "star", label: "STAR 정리", icon: "🧠" },
  { key: "competency", label: "역량 추출", icon: "✨" },
  { key: "draft", label: "초안 작성", icon: "✍️" },
  { key: "feedback", label: "AI 첨삭", icon: "🤖" },
  { key: "final", label: "최종본", icon: "🏁" },
];

const experienceCompetencies = [
  {
    title: "서비스 역량",
    description: "상대의 필요와 불편을 이해하고, 더 나은 경험을 제공하는 역량입니다.",
    question: "누군가의 필요를 알아차리고 도움을 주거나 불편을 개선한 적이 있나요?",
    level3: "고객의 숨은 요구를 확인하고, 맡은 업무 안에서 새로운 서비스 방법을 생각해 실행합니다.",
    level4: "독창적인 시도로 고객에게 감동을 주고, 서비스 제공 방식의 변화를 시도합니다.",
  },
  {
    title: "문제해결능력",
    description: "문제의 원인을 파악하고, 대안을 실행하며 결과를 점검하는 역량입니다.",
    question: "예상치 못한 문제를 어떻게 파악했고, 어떤 방법을 시도했나요?",
    level3: "문제를 빠짐없이, 겹치지 않게 나누어 분석하고 근본 원인과 논리적인 대안을 제시합니다.",
    level4: "문제가 다시 생기지 않도록 근본적인 조치를 실행하고, 체계적인 개선 성과를 만듭니다.",
  },
  {
    title: "책임감·커리어 오너십",
    description: "맡은 일을 끝까지 해내고, 자신의 성장과 진로를 주도적으로 만들어가는 역량입니다.",
    question: "끝까지 책임진 일이나, 스스로 목표를 세워 배우고 도전한 경험이 있나요?",
    level3: "예상하지 못한 어려움에도 맡은 일을 완수하고, 팀 목표를 위해 먼저 나서서 행동합니다.",
    level4: "시행착오와 배운 방법을 공유하여 동료가 겪을 위험이나 실수를 미리 줄입니다.",
  },
  {
    title: "협업능력·컬처애드",
    description: "다른 의견을 존중하며 함께 일하고, 자신의 관점과 강점으로 팀에 긍정적인 변화를 더하는 역량입니다.",
    question: "의견 차이를 조율하거나, 나의 관점과 강점을 더해 팀이 함께 목표를 달성한 경험이 있나요?",
    level3: "남들이 꺼리는 일에 자원하고, 갈등 상황을 적극적으로 중재하여 협력을 이끌어냅니다.",
    level4: "팀 목표를 먼저 생각해 각자의 역량을 합친 것 이상의 성과를 만들고, 조직 문화를 개선합니다.",
  },
];

const interviewerLevels = [
  { level: 1, title: "수동적 행동", description: "지시와 지침에 따라 행동합니다." },
  { level: 2, title: "통상적 행동", description: "해야 할 일을 제때 수행합니다." },
  { level: 3, title: "능동적 행동", description: "명확한 의도와 판단에 근거해 행동합니다." },
  { level: 4, title: "창조적 행동", description: "새로운 방법을 시도해 상황에 변화를 만듭니다." },
  { level: 5, title: "패러다임 전환", description: "기존 사고의 틀을 바꾸고 새로운 환경을 만듭니다." },
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
  courseId: "",
  courseName: "",
  participationSynced: false,
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
  const [data, setData] = useState(() => normalizeWorkbook(defaultData));
  const [storageReady, setStorageReady] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  const [, setStudentList] = useState([]);
  const [savedNotice, setSavedNotice] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = normalizeWorkbook({ ...defaultData, ...parsed });
        setData(merged);
        if (!merged.major || !merged.nickname || !merged.courseId) {
          setShowWelcomeModal(true);
        }
      } else {
        setShowWelcomeModal(true);
      }
    } catch (error) {
      console.error("저장된 데이터를 불러오지 못했습니다.", error);
      setShowWelcomeModal(true);
    }
    setStorageReady(true);

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
    if (!storageReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedNotice(true);
      const timer = setTimeout(() => setSavedNotice(false), 1200);
      return () => clearTimeout(timer);
    } catch (error) {
      console.error("데이터를 저장하지 못했습니다.", error);
    }
  }, [data, storageReady]);

  const updateField = (key, value) => {
    setData((prev) => updateWorkbookField(prev, key, value));
  };

  const addWorkbookQuestion = () => { setData(prev => addQuestion(prev)); setCurrentStep(0); };
  const deleteWorkbookQuestion = (id, index) => {
    if (data.questions.length <= 1) return;
    if (!window.confirm(`문항 ${index + 1}과 이 문항의 경험·초안·최종본을 삭제할까요? 삭제한 내용은 복구할 수 없습니다.`)) return;
    setData(prev => removeQuestion(prev, id));
  };
  const activeQuestionIndex = data.questions.findIndex(item => item.id === data.activeQuestionId);

  const registerStudentLocal = (major, nickname, courseId, courseName) => {
    const nextStudent = {
      courseId,
      courseName,
      major,
      nickname,
      joinedAt: new Date().toLocaleString("ko-KR"),
    };

    setStudentList((prev) => {
      const filtered = prev.filter(
        (item) => !(item.major === major && item.nickname === nickname && item.courseId === courseId)
      );
      const nextList = [nextStudent, ...filtered];
      localStorage.setItem(STUDENT_LIST_KEY, JSON.stringify(nextList));
      return nextList;
    });
  };

  const enterWorkbook = ({ courseId, courseName, synced }) => {
    const major = data.major.trim();
    const nickname = data.nickname.trim();
    setData(prev => ({ ...prev, major, nickname, courseId, courseName, participationSynced: synced }));
    registerStudentLocal(major, nickname, courseId, courseName);
    setShowWelcomeModal(false);
  };

  const openAdminModal = () => window.location.assign("/admin");

  const resetAll = () => {
    const ok = window.confirm("입력한 내용을 모두 초기화할까요?");

    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    setData(normalizeWorkbook(defaultData));
    setCurrentStep(0);
    setShowWelcomeModal(true);
  };

  const downloadText = () => {
    const content = workbookText(data);

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
            new Paragraph({ children: [new TextRun({ text: "AI 기반 자기소개서 워크북", bold: true, size: 32 })] }),
            ...workbookSections(data).flatMap(section => [
              new Paragraph(""),
              new Paragraph({ children: [new TextRun({ text: section.title, bold: true })] }),
              ...section.fields.flatMap(([label, value]) => [
                new Paragraph(label),
                ...String(value || "").split("\n").map(line => new Paragraph(line)),
              ]),
            ]),
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
  
          ${workbookSections(data).map(section => `<section><h2>${escapeHtml(section.title)}</h2>${section.fields.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong><br />${escapeHtml(value || "")}</p>`).join("")}</section>`).join("")}
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

  const completedSteps = useMemo(() => {
    return [
      Boolean(data.major && data.nickname && data.jobTitle && data.question),
      Boolean(data.experienceTitle && data.experienceSummary),
      Boolean(data.situation && data.task && data.action && data.result),
      Boolean(data.competencies),
      Boolean(data.draft),
      Boolean(data.aiFeedback && data.revisedDraft),
      Boolean(data.finalDraft),
    ];
  }, [data]);
  const completedCount = completedSteps.filter(Boolean).length;

  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const finalCharCount = characterCount(data.finalDraft, data.charCountMode);
  const draftCharCount = characterCount(data.draft, data.charCountMode);
  const countModeLabel = data.charCountMode === "excludeSpaces" ? "공백 제외" : "공백 포함";

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

  const promptDraft = buildDraftPrompt(data);

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
${lengthInstruction(data)}

지원 직무: ${data.jobTitle || "[지원 직무 입력]"}
문항: ${data.question || "[문항 입력]"}
수정본: ${data.revisedDraft || "[수정본 입력]"}`;

  return (
    <div style={appStyle}>
      <style>{globalCss}</style>

      {showWelcomeModal && (
        <CourseEntry
          major={data.major}
          nickname={data.nickname}
          onMajorChange={(value) => updateField("major", value)}
          onNicknameChange={(value) => updateField("nickname", value)}
          onEnter={enterWorkbook}
          onInstructor={openAdminModal}
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
          courseName={data.courseName}
          onChangeParticipation={() => setShowWelcomeModal(true)}
        />

        <section className="question-switcher" aria-label="작성 문항 선택">
          <label htmlFor="active-workbook-question">작성 중인 문항</label>
          <select id="active-workbook-question" value={data.activeQuestionId} onChange={event => setData(prev => selectQuestion(prev, event.target.value))}>
            {data.questions.map((item, index) => <option key={item.id} value={item.id}>문항 {index + 1}: {item.question.trim().replace(/\s+/g, " ").slice(0, 60) || "문항을 입력해주세요"}</option>)}
          </select>
          <button type="button" style={styles.secondaryButton} onClick={() => setCurrentStep(0)}>문항 관리</button>
          <p>현재 문항 {activeQuestionIndex + 1} / 총 {data.questions.length}개 · 경험, STAR, 초안과 최종본은 문항별로 저장됩니다. 진행률은 선택한 문항 기준입니다.</p>
        </section>
        <div style={styles.stepRow}>
          {steps.map((step, index) => (
            <StepChip
              key={step.key}
              label={step.label}
              icon={step.icon}
              index={index}
              active={currentStep === index}
              done={completedSteps[index]}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        <div className="workbook-main-grid" style={styles.mainGrid}>
          <div style={styles.leftColumn}>
            {currentStep === 0 && (
              <SectionCard
                title="1단계. 지원정보·문항 설정"
                description="지원기업·직무·JD를 정리하고, 자기소개서 문항마다 제한 글자수를 설정하세요."
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
                  label="채용공고 / JD"
                  value={data.jdText}
                  onChange={(value) => updateField("jdText", value)}
                  placeholder="채용공고 주요 내용이나 직무 요구 역량을 붙여 넣으세요."
                  textarea
                  rows={10}
                />
                <section className="question-list" aria-label="자기소개서 문항 관리">
                  <h3>자기소개서 문항</h3>
                  <p>문항을 하나씩 추가하세요. 작성할 문항을 선택하면 2~7단계에서 해당 문항의 내용을 이어서 작성할 수 있습니다. 제한 글자수와 공백 계산 기준은 문항마다 따로 설정합니다. 지원 직무·기업명·채용공고는 모든 문항에 공통으로 적용됩니다.</p>
                  {data.questions.map((item, index) => <article key={item.id} className="question-card" aria-label={`자기소개서 문항 ${index + 1}`}>
                    <div className="question-card-actions">
                      <strong>문항 {index + 1}{item.id === data.activeQuestionId ? " · 작성 중" : ""}</strong>
                      <button type="button" style={styles.secondaryButton} aria-pressed={item.id === data.activeQuestionId} onClick={() => setData(prev => selectQuestion(prev, item.id))}>문항 {index + 1} 작성</button>
                      <button type="button" style={styles.secondaryButton} disabled={data.questions.length <= 1} onClick={() => deleteWorkbookQuestion(item.id, index)}>문항 {index + 1} 삭제</button>
                    </div>
                    <Field label={`자기소개서 문항 ${index + 1}`} value={item.question} onChange={value => setData(prev => editQuestion(prev, item.id, value))} placeholder="예: 지원 직무를 위해 준비한 경험과 강점을 작성하시오." textarea rows={4} />
                    <div className="question-length-settings">
                      <div>
                        <label htmlFor={`question-limit-${item.id}`} style={styles.label}>문항 {index + 1} 제한 글자수</label>
                        <input id={`question-limit-${item.id}`} type="text" inputMode="numeric" pattern="[0-9]*" value={item.charLimit} onChange={event => setData(prev => updateQuestion(prev, item.id, { charLimit: event.target.value.replace(/\D/g, "") }))} placeholder="예: 500" style={styles.input} />
                      </div>
                      <div>
                        <label htmlFor={`question-count-mode-${item.id}`} style={styles.label}>문항 {index + 1} 글자수 계산 기준</label>
                        <select id={`question-count-mode-${item.id}`} value={item.charCountMode} onChange={event => setData(prev => updateQuestion(prev, item.id, { charCountMode: event.target.value }))} style={styles.input}>
                          <option value="includeSpaces">공백 포함</option>
                          <option value="excludeSpaces">공백 제외</option>
                        </select>
                      </div>
                    </div>
                    <p>제출처의 제한을 양의 정수로 입력하세요. 비워두면 미설정으로 유지됩니다. 공백 포함은 줄바꿈을 1자로 세고, 공백 제외는 띄어쓰기와 줄바꿈을 제외합니다.</p>
                  </article>)}
                  <button type="button" style={styles.primaryButton} onClick={addWorkbookQuestion}>+ 문항 추가</button>
                </section>
              </SectionCard>
            )}

            {currentStep === 1 && (
              <SectionCard
                title="2단계. 면접관의 시선으로 경험 탐색"
                description="면접관은 경험에서 드러난 행동의 수준을 살펴봅니다. 단순히 ‘열심히 했다’는 표현을 넘어, 왜 그렇게 판단했고 어떻게 행동했는지 떠올려보세요."
                tip="수업, 아르바이트, 동아리, 팀 프로젝트, 일상 속 작은 경험도 좋습니다. 모든 역량을 담을 필요는 없습니다."
                icon="📌"
              >
                <details className="interviewer-guide">
                  <summary>면접관의 역량 평가 5단계 모델 보기</summary>
                  <div className="interviewer-guide-content">
                  <p>강의안의 5단계 모델로 나의 행동을 돌아보세요. 기본적인 역할 수행에서 나아가, 나의 판단과 구체적인 행동이 드러나는 경험을 탐색합니다.</p>
                  <ol className="interviewer-level-grid">
                    {interviewerLevels.map(({ level, title, description }) => (
                      <li key={level} className={level === 3 || level === 4 ? "interviewer-level interviewer-level-target" : "interviewer-level"}>
                        <span className="interviewer-level-label">Level {level}</span>
                        <strong>{title}</strong>
                        <p>{description}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="interviewer-level-focus">작성 포인트: 경험을 나열하기보다 ‘왜(의도·판단)’와 ‘어떻게(나의 행동·차별성)’를 적어보세요. 아래 역량별 기준은 강의안에서 강조한 Level 3~4의 행동을 보여줍니다.</p>
                  <small>강의안 참고: 면접관의 역량 평가 5단계 모델 · 4대 핵심 역량별 평가 기준</small>
                  </div>
                </details>
                <div className="experience-competency-grid" aria-label="면접관이 살펴보는 4대 핵심역량">
                  {experienceCompetencies.map(({ title, description, question, level3, level4 }, index) => (
                    <article className="experience-competency-card" key={title}>
                      <h3>{index + 1}) {title}</h3>
                      <p>{description}</p>
                      <details className="experience-criteria-accordion">
                        <summary>Level 3·4 평가 기준 보기</summary>
                        <dl className="experience-behavior-criteria">
                          <div><dt>Level 3 · 능동적 행동</dt><dd>{level3}</dd></div>
                          <div><dt>Level 4 · 창조적 행동</dt><dd>{level4}</dd></div>
                        </dl>
                      </details>
                      <p className="experience-competency-question">돌아볼 질문: {question}</p>
                    </article>
                  ))}
                </div>
                <p className="experience-writing-guide">
                  떠오르는 경험을 편하게 적어보세요. 여러 경험을 메모해도 좋습니다.
                  그중 다음 STAR 단계에서 구체화할 경험을 중심으로 제목과 내용을 정리해보세요.
                </p>
                <Field
                  label="경험 제목"
                  value={data.experienceTitle}
                  onChange={(value) => updateField("experienceTitle", value)}
                  placeholder="예: 고객의 불편을 개선한 아르바이트, 팀원과 갈등을 풀었던 프로젝트"
                />
                <Field
                  label="나의 경험 자유롭게 작성하기"
                  value={data.experienceSummary}
                  onChange={(value) => updateField("experienceSummary", value)}
                  placeholder="어떤 상황이었나요? 내가 생각하고 행동한 일, 주변의 반응, 결과와 배운 점을 자유롭게 적어보세요. 아직 정리되지 않은 메모도 괜찮습니다."
                  textarea
                  rows={8}
                  help="분량이나 형식에 제한은 없습니다. 판단한 이유, 내가 취한 구체적인 행동, 그로 인한 변화와 결과를 실제 경험에 맞게 적어보세요."
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
                <div className="draft-length-option">
                  <label><input type="checkbox" checked={data.draftOverflow} onChange={event => updateField("draftOverflow", event.target.checked)} /> 퇴고를 고려하여 제한 글자수의 120%로 초안 생성</label>
                  <p>{data.charLimit ? `문항 ${activeQuestionIndex + 1} 제출 제한: ${data.charLimit}자 (${countModeLabel}) · 초안 목표: ${draftTarget(data)}자 이내` : "1단계에서 이 문항의 제한 글자수를 설정하세요. 미설정된 제한은 프롬프트에서 임의로 정하지 않습니다."}</p>
                </div>
                <PromptBox title="초안 생성 프롬프트" prompt={promptDraft} />
                <Field
                  label="AI 초안 또는 내가 작성한 초안"
                  value={data.draft}
                  onChange={(value) => updateField("draft", value)}
                  placeholder="AI가 생성한 초안 또는 직접 작성한 초안을 붙여 넣으세요."
                  textarea
                  rows={14}
                />
                <div style={styles.counterBox}>초안 글자수 ({countModeLabel}): {draftCharCount}{data.charLimit ? ` / 목표 ${draftTarget(data)}자 이내` : " · 제한 미설정"}</div>
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
                <div role="status" style={{ ...styles.counterBox, color: data.charLimit && finalCharCount > Number(data.charLimit) ? "#b42318" : COLORS.text }}>
                  최종본 글자수 ({countModeLabel}): {finalCharCount}{data.charLimit ? ` / 제한 ${data.charLimit}자 · ${finalCharCount > Number(data.charLimit) ? `${finalCharCount - Number(data.charLimit)}자 초과 — 직접 줄여주세요.` : `${Number(data.charLimit) - finalCharCount}자 남음`}` : " · 제한 미설정 — 1단계에서 설정하세요."}
                  <div>공백 포함 {characterCount(data.finalDraft)}자 / 공백 제외 {characterCount(data.finalDraft, "excludeSpaces")}자</div>
                  {data.draftOverflow && <div>120% 옵션은 초안에만 적용합니다. 최종본은 실제 제출 제한에 맞추세요.</div>}
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

          <div className="workbook-sidebar" style={styles.rightColumn}>
            <SidebarCard title="사용자 정보" icon="👤">
              <InfoRow label="참가 교과목" value={data.courseName || "미선택"} />
              <InfoRow label="전공" value={data.major || "미입력"} />
              <InfoRow label="닉네임" value={data.nickname || "미입력"} />
              {data.courseId && !data.participationSynced && <p role="status" style={styles.noticeBox}>현재 브라우저에만 저장됩니다. Firebase 연결 후 다시 입장하면 교수자 참가 목록에 등록됩니다.</p>}
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
                  label="지원정보·문항 설정"
                  done={Boolean(
                    data.major &&
                      data.nickname &&
                      data.jobTitle &&
                      data.question
                  )}
                />
                <ProgressItem
                  label="면접관의 시선으로 경험 탐색"
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
  courseName,
  onChangeParticipation,
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
              {courseName && <span style={styles.infoTag}>참가: {courseName}</span>}
              {major ? <span style={styles.infoTag}>전공: {major}</span> : null}
              {nickname ? (
                <span style={styles.infoTagBlue}>닉네임: {nickname}</span>
              ) : null}
            </div>
          )}
        </div>
        <div style={styles.headerButtons}>
          <button type="button" onClick={onChangeParticipation} style={styles.secondaryButton}>참가 교과목 변경</button>
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
            교수자 교과목·참가 목록
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
    <div className="workbook-section" style={{ ...glassCardStyle, padding: 28 }}>
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
  const fieldId = useId();
  return (
    <div>
      <label htmlFor={fieldId} style={styles.label}>{label}</label>
      {help ? <div style={styles.helpText}>{help}</div> : null}
      {textarea ? (
        <textarea
          id={fieldId}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={styles.textarea}
        />
      ) : (
        <input
          id={fieldId}
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
  .workbook-main-grid > div { min-width: 0; }
  .question-switcher { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px; margin-top: 18px; border: 1px solid #e7ddf7; border-radius: 18px; background: rgba(255,255,255,.85); }
  .question-switcher label { font-weight: 700; }
  .question-switcher select { min-width: 0; flex: 1 1 240px; max-width: 100%; padding: 12px; border: 1px solid #e7ddf7; border-radius: 12px; background: #fff; font: inherit; }
  .question-switcher p { width: 100%; margin: 0; font-size: 13px; line-height: 1.7; color: #6d6875; }
  .question-list { display: grid; gap: 14px; }
  .question-list h3, .question-list p { margin: 0; }
  .question-list p { font-size: 14px; line-height: 1.7; color: #6d6875; }
  .question-card { min-width: 0; padding: 16px; border: 1px solid #e7ddf7; border-radius: 16px; background: #f8f5ff; }
  .question-card-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
  .question-card-actions strong { flex: 1 1 120px; }
  .question-length-settings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 14px 0 10px; }
  .question-length-settings > div { min-width: 0; }
  .draft-length-option { border: 1px solid #e7ddf7; border-radius: 14px; padding: 14px; background: #f8f5ff; }
  .draft-length-option label { display: flex; align-items: flex-start; gap: 8px; line-height: 1.6; font-weight: 700; }
  .draft-length-option input { flex-shrink: 0; margin-top: 5px; }
  .draft-length-option p { margin: 8px 0 0; font-size: 13px; line-height: 1.7; }
  @media (max-width: 600px) { .question-length-settings { grid-template-columns: minmax(0, 1fr); } }
  .question-card button:disabled { opacity: .5; cursor: not-allowed; }
  .interviewer-guide { border-radius: 18px; border: 1px solid #e7ddf7; background: #f8f5ff; }
  .interviewer-guide-content { padding: 0 18px 18px; }
  .interviewer-guide > summary, .experience-criteria-accordion > summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; cursor: pointer; list-style: none; font-weight: 700; font-size: 14px; color: #5541b9; border-radius: 18px; }
  .interviewer-guide > summary::-webkit-details-marker, .experience-criteria-accordion > summary::-webkit-details-marker { display: none; }
  .interviewer-guide > summary::after, .experience-criteria-accordion > summary::after { content: "+"; font-size: 20px; flex-shrink: 0; }
  .interviewer-guide[open] > summary::after, .experience-criteria-accordion[open] > summary::after { content: "−"; }
  .interviewer-guide > summary:focus-visible, .experience-criteria-accordion > summary:focus-visible { outline: 3px solid #8b7cf6; outline-offset: 3px; }
  .interviewer-guide p { margin: 0; font-size: 14px; line-height: 1.7; }
  .interviewer-guide small { display: block; margin-top: 12px; color: #6d6875; line-height: 1.6; }
  .interviewer-level-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin: 16px 0; padding: 0; list-style: none; }
  .interviewer-level { min-width: 0; padding: 12px; border: 1px solid #e7ddf7; border-radius: 12px; background: #fff; overflow-wrap: anywhere; }
  .interviewer-level-label { display: block; margin-bottom: 6px; color: #6d6875; font-size: 12px; font-weight: 700; }
  .interviewer-level strong { display: block; margin-bottom: 6px; font-size: 14px; }
  .interviewer-level-target { border-color: #9e8cf3; background: #efe7ff; }
  .interviewer-guide .interviewer-level-focus { padding: 12px; border-radius: 12px; background: #fff; color: #5541b9; }
  .experience-competency-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .experience-competency-card {
    min-width: 0;
    padding: 18px;
    border: 1px solid #e7ddf7;
    border-radius: 18px;
    background: rgba(255,255,255,0.85);
    overflow-wrap: anywhere;
  }
  .experience-competency-card h3 { margin: 0 0 10px; font-size: 16px; color: #6f5ce7; }
  .experience-competency-card p { margin: 0; font-size: 14px; line-height: 1.7; }
  .experience-competency-card .experience-competency-question { margin-top: 12px; color: #6d6875; }
  .experience-criteria-accordion { margin-top: 14px; }
  .experience-criteria-accordion > summary { padding: 10px 12px; border: 1px solid #e7ddf7; border-radius: 10px; background: #f8f5ff; }
  .experience-behavior-criteria { display: grid; gap: 8px; margin: 14px 0 0; font-size: 13px; line-height: 1.7; }
  .experience-behavior-criteria > div { padding: 10px; border-radius: 10px; background: #f8f5ff; }
  .experience-behavior-criteria > div:last-child { background: #fff8eb; }
  .experience-behavior-criteria dt { font-weight: 700; color: #5541b9; }
  .experience-behavior-criteria dd { margin: 4px 0 0; }
  .experience-writing-guide { margin: 0; font-size: 14px; line-height: 1.7; color: #6d6875; }
  .workbook-section { min-width: 0; overflow-wrap: anywhere; }
  @media (max-width: 600px) {
    .experience-competency-grid, .interviewer-level-grid { grid-template-columns: minmax(0, 1fr); }
    .workbook-section { padding: 18px !important; }
  }
  @media (max-width: 920px) {
    .workbook-main-grid { grid-template-columns: minmax(0, 1fr) !important; }
    .workbook-sidebar { position: static !important; }
    div[style*="grid-template-columns: repeat(3"] {
      grid-template-columns: 1fr !important;
    }
  }
`;
