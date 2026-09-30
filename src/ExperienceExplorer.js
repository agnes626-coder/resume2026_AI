import React, { useEffect, useId, useRef } from 'react';

export function ExperienceSelection({ data, onSelect, onContinue, buttonStyle }) {
  const selectId = useId();
  const available = data.experiences.filter(item => !item.archived);
  const selected = available.find(item => item.id === data.selectedExperienceId);
  return <section className="experience-selection" aria-label="문항별 경험 선택">
    <label htmlFor={selectId}>현재 문항에 사용할 경험</label>
    <select id={selectId} value={selected?.id || ''} onChange={event => onSelect(event.target.value)}>
      <option value="">경험 선택 안 함</option>
      {available.map((item, index) => <option key={item.id} value={item.id}>경험 {index + 1}: {item.experienceTitle.trim() || '제목 없는 경험'}</option>)}
    </select>
    <p role="status">{selected ? `선택한 경험: ${selected.experienceTitle || '제목 없는 경험'}` : '2단계의 경험 목록에서 이 문항에 사용할 경험을 선택하세요.'}</p>
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
    <h3>나의 경험 목록</h3>
    <p>처음부터 STAR 형식에 맞추지 않아도 됩니다. 생각나는 경험을 원하는 만큼 추가하고, 왜 그렇게 판단했는지와 실제로 어떻게 행동했는지를 자유롭게 적어보세요.</p>
    <ExperienceSelection data={data} onSelect={onSelect} onContinue={onContinue} buttonStyle={primaryButton} />
    <p aria-live="polite">경험 {available.length}개 · 현재 문항에 사용할 경험을 고른 뒤 STAR로 구체화하세요.</p>
    {!available.length && <p className="experience-empty">아직 작성한 경험이 없습니다. 아래 ‘+ 경험 추가’ 버튼으로 첫 경험을 적어보세요.</p>}
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
    <button type="button" onClick={onAdd} style={primaryButton}>+ 경험 추가</button>
    <p>삭제한 경험은 아래에서 복원할 수 있습니다. 경험을 삭제해도 연결된 문항의 작성본은 보관됩니다.</p>
    {archived.length > 0 && <details className="archived-experiences"><summary>삭제한 경험 {archived.length}개 복원</summary>
      {archived.map((item, index) => <div key={item.id}><span>{item.experienceTitle || '제목 없는 경험'}</span><button type="button" aria-label={`보관 경험 ${index + 1} 복원`} onClick={() => onRestore(item.id)} style={secondaryButton}>복원</button></div>)}
    </details>}
  </section>;
}
