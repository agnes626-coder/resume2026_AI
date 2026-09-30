import React, { useEffect, useId, useRef } from 'react';

export function ExperienceSelection({ data, onSelect, onContinue, onExplore, buttonStyle }) {
  const selectId = useId();
  const available = data.experiences.filter(item => !item.archived);
  const selected = available.find(item => item.id === data.selectedExperienceId);
  if (!available.length) return <section className="experience-selection" aria-label="문항별 경험 선택">
    <p role="status">아직 추가한 경험·사례가 없습니다. 자기소개서 문항에 답할 실제 사례를 먼저 추가하세요.</p>
    {onExplore && <button type="button" onClick={onExplore} style={buttonStyle}>2단계에서 경험·사례 추가하기</button>}
  </section>;
  return <section className="experience-selection" aria-label="문항별 경험 선택">
    <label htmlFor={selectId}>현재 자기소개서 문항에 사용할 경험·사례</label>
    <select id={selectId} value={selected?.id || ''} onChange={event => onSelect(event.target.value)}>
      <option value="">아직 선택하지 않음</option>
      {available.map((item, index) => <option key={item.id} value={item.id}>경험 {index + 1}: {item.experienceTitle.trim() || '제목 없는 경험'}</option>)}
    </select>
    <p role="status">{selected ? `선택한 경험: ${selected.experienceTitle || '제목 없는 경험'}` : '추가한 사례 중 이 자기소개서 문항에 답할 이야기를 선택하세요.'}</p>
    <p>경험 메모는 모든 문항에서 함께 사용합니다. STAR·초안·최종본은 문항과 선택 경험마다 따로 보관하며, 다른 경험으로 바꿨다가 돌아오면 이어서 작성할 수 있습니다.</p>
    {selected && <details className="selected-experience-memo"><summary>선택한 경험 메모 보기</summary><p>{selected.experienceSummary || '아직 경험 메모가 없습니다.'}</p></details>}
    {onContinue && <button type="button" disabled={!selected} onClick={onContinue} style={buttonStyle}>선택한 경험으로 STAR 작성</button>}
  </section>;
}

export function ExperienceExplorer({ data, onAdd, onUpdate, onSelect, onArchive, onRestore, onContinue, Field, primaryButton, secondaryButton }) {
  const available = data.experiences.filter(item => !item.archived);
  const archived = data.experiences.filter(item => item.archived);
  const previousIds = useRef(new Set(available.map(item => item.id)));
  const cards = useRef(new Map());
  useEffect(() => {
    const added = available.find(item => !previousIds.current.has(item.id));
    if (added) cards.current.get(added.id)?.querySelector('input')?.focus();
    previousIds.current = new Set(available.map(item => item.id));
  }, [available]);
  return <section className="experience-explorer" aria-label="여러 경험 자유롭게 탐색하기">
    <h3>자기소개서 문항에 쓸 나의 경험·사례</h3>
    <p>자기소개서 문항은 1단계에 입력하는 질문입니다. 여기에는 그 질문에 답할 실제 이야기를 적습니다. 수업 과제, 팀 프로젝트, 아르바이트, 동아리에서 내가 맡고 행동했던 구체적인 사례를 떠올려보세요.</p>
    <p>예: 문항이 ‘협업 경험을 설명하세요’라면, 사례는 ‘팀 프로젝트에서 의견 차이를 조율한 일’입니다.</p>
    <p>처음부터 STAR 형식에 맞추지 않아도 됩니다. 생각나는 경험을 원하는 만큼 추가하고, 왜 그렇게 판단했는지와 실제로 어떻게 행동했는지를 자유롭게 적어보세요.</p>
    <button type="button" onClick={onAdd} style={primaryButton}>+ 경험·사례 추가</button>
    <p aria-live="polite">작성한 경험·사례 {available.length}개</p>
    {!available.length && <p className="experience-empty">위 ‘+ 경험·사례 추가’를 누르면 제목과 내용을 적는 입력란이 열립니다. 먼저 사례를 작성한 다음, 이 문항에 사용할 사례를 선택해 STAR로 구체화하세요.</p>}
    {available.map((item, index) => <article key={item.id} ref={element => { if (element) cards.current.set(item.id, element); else cards.current.delete(item.id); }} className={`experience-memo-card${item.id === data.selectedExperienceId ? ' experience-memo-selected' : ''}`} aria-label={`경험 ${index + 1} 메모`}>
      <div className="experience-memo-actions">
        <h4>경험 {index + 1}{item.id === data.selectedExperienceId ? ' · 현재 문항에 사용 중' : ''}</h4>
        <button type="button" aria-pressed={item.id === data.selectedExperienceId} onClick={() => onSelect(item.id)} style={secondaryButton}>경험 {index + 1} 사용</button>
        <button type="button" onClick={() => onArchive(item.id)} style={secondaryButton}>경험 {index + 1} 삭제</button>
      </div>
      <Field label={`경험 ${index + 1} 제목`} value={item.experienceTitle} onChange={value => onUpdate(item.id, 'experienceTitle', value)} placeholder="예: 고객의 불편을 개선한 아르바이트, 의견 차이를 조율한 프로젝트" />
      <Field label={`경험 ${index + 1} 자유롭게 작성하기`} value={item.experienceSummary} onChange={value => onUpdate(item.id, 'experienceSummary', value)} placeholder="어떤 상황이었나요? 내가 생각하고 행동한 일, 주변의 반응, 결과와 배운 점을 자유롭게 적어보세요. 아직 정리되지 않은 메모도 괜찮습니다." textarea rows={6} help="분량이나 형식에 제한은 없습니다. 판단한 이유, 나의 구체적인 행동, 그로 인한 변화와 결과를 실제 경험에 맞게 적어보세요." />
      <p>사용하는 문항: {data.questions.map((question, questionIndex) => question.selectedExperienceId === item.id ? questionIndex + 1 : null).filter(Boolean).join(', ') || '아직 선택하지 않음'}</p>
    </article>)}
    {available.length > 0 && <ExperienceSelection data={data} onSelect={onSelect} onContinue={onContinue} buttonStyle={primaryButton} />}
    <p>삭제한 경험은 아래에서 복원할 수 있습니다. 경험을 삭제해도 연결된 문항의 작성본은 보관됩니다.</p>
    {archived.length > 0 && <details className="archived-experiences"><summary>삭제한 경험 {archived.length}개 복원</summary>
      {archived.map((item, index) => <div key={item.id}><span>{item.experienceTitle || '제목 없는 경험'}</span><button type="button" aria-label={`보관 경험 ${index + 1} 복원`} onClick={() => onRestore(item.id)} style={secondaryButton}>복원</button></div>)}
    </details>}
  </section>;
}
