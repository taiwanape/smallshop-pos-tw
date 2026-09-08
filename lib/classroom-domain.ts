export const PETS = ['🦊', '🐱', '🐶', '🐰', '🐼', '🐨', '🐯', '🐸'] as const;
export type Student = {
  id: string;
  name: string;
  group: string;
  pet: number;
  points: number;
  food: number;
  growth: number;
};
export type Classroom = { id: string; name: string; students: Student[] };
export type Activity = {
  id: string;
  classId: string;
  students: { id: string; name: string }[];
  points: number;
  food: number;
  growth: number;
  reason: string;
  at: string;
  undone: boolean;
};
export type ClassState = {
  version: 1;
  classes: Classroom[];
  activities: Activity[];
};
export type Command =
  | { type: 'create'; id: string; name: string; names: string[] }
  | {
      type: 'add';
      classId: string;
      students: { id: string; name: string; group: string; pet: number }[];
    }
  | { type: 'rename'; classId: string; name: string }
  | {
      type: 'edit';
      classId: string;
      studentId: string;
      name: string;
      group: string;
      pet: number;
    }
  | { type: 'remove'; classId: string; studentId: string }
  | { type: 'delete-class'; classId: string }
  | {
      type: 'act';
      id: string;
      classId: string;
      ids: string[];
      kind: 'score' | 'exchange' | 'feed';
      delta?: number;
      reason: string;
      at: string;
    }
  | { type: 'undo'; id: string };
export const emptyClassState = (): ClassState => ({
  version: 1,
  classes: [],
  activities: [],
});
const requireText = (value: string, max = 80) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`請輸入 1–${max} 字的內容。`);
  return value.trim();
};
const validNumber = (v: unknown, max = 1000000) =>
  Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= max;
export function validateClassState(
  value: unknown,
): asserts value is ClassState {
  const s = value as ClassState;
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.classes) ||
    !Array.isArray(s.activities) ||
    s.classes.length > 100 ||
    s.activities.length > 50000
  )
    throw new Error('不是有效的班級小夥伴備份。');
  const classIds = new Set<string>();
  const studentIds = new Set<string>();
  const eventIds = new Set<string>();
  for (const c of s.classes) {
    requireText(c.id, 120);
    requireText(c.name);
    if (
      classIds.has(c.id) ||
      !Array.isArray(c.students) ||
      c.students.length > 200
    )
      throw new Error('班級資料重複或超出 200 人限制。');
    classIds.add(c.id);
    for (const p of c.students) {
      requireText(p.id, 120);
      requireText(p.name, 40);
      if (
        studentIds.has(p.id) ||
        typeof p.group !== 'string' ||
        p.group.length > 40 ||
        !validNumber(p.pet, PETS.length - 1) ||
        ![p.points, p.food, p.growth].every((v) => validNumber(v))
      )
        throw new Error('學生資料或積分格式錯誤。');
      studentIds.add(p.id);
    }
  }
  for (const e of s.activities) {
    requireText(e.id, 120);
    requireText(e.reason);
    if (
      eventIds.has(e.id) ||
      !classIds.has(e.classId) ||
      !Array.isArray(e.students) ||
      e.students.length < 1 ||
      e.students.length > 200 ||
      typeof e.undone !== 'boolean' ||
      typeof e.at !== 'string' ||
      !Number.isFinite(Date.parse(e.at)) ||
      ![e.points, e.food, e.growth].every(
        (v) => Number.isSafeInteger(v) && Math.abs(v) <= 1000000,
      )
    )
      throw new Error('紀錄格式錯誤。');
    const eventStudents = new Set<string>();
    for (const p of e.students) {
      requireText(p.id, 120);
      requireText(p.name, 40);
      if (eventStudents.has(p.id)) throw new Error('紀錄學生重複。');
      eventStudents.add(p.id);
    }
    eventIds.add(e.id);
  }
}
export function parseClassBackup(raw: string): ClassState {
  if (raw.length > 20000000) throw new Error('備份檔超過 20 MB。');
  const state: unknown = JSON.parse(raw);
  validateClassState(state);
  return structuredClone(state);
}
export function applyClassCommand(
  original: ClassState,
  cmd: Command,
): ClassState {
  const s = structuredClone(original);
  if (cmd.type === 'create') {
    if (s.classes.some((c) => c.id === cmd.id)) return s;
    s.classes.push({
      id: cmd.id,
      name: requireText(cmd.name),
      students: cmd.names.map((name, i) => ({
        id: `${cmd.id}-${i}`,
        name: requireText(name, 40),
        group: '',
        pet: i % PETS.length,
        points: 0,
        food: 0,
        growth: 0,
      })),
    });
  } else if (cmd.type === 'undo') {
    const event = s.activities.find((e) => e.id === cmd.id);
    if (!event || event.undone) throw new Error('這筆紀錄已撤銷或不存在。');
    const c = s.classes.find((c) => c.id === event.classId);
    if (!c) throw new Error('找不到班級。');
    for (const ref of event.students) {
      const student = c.students.find((p) => p.id === ref.id);
      if (!student) throw new Error('學生已移除，無法撤銷。');
      student.points -= event.points;
      student.food -= event.food;
      student.growth -= event.growth;
      if ([student.points, student.food, student.growth].some((v) => v < 0))
        throw new Error('積分或食物已使用，請先撤銷後續操作。');
    }
    event.undone = true;
  } else {
    const c = s.classes.find((c) => c.id === cmd.classId);
    if (!c) throw new Error('找不到班級，請重新選擇。');
    if (cmd.type === 'rename') c.name = requireText(cmd.name);
    if (cmd.type === 'add')
      c.students.push(
        ...cmd.students.map((p) => ({
          ...p,
          name: requireText(p.name, 40),
          group: p.group.trim(),
          points: 0,
          food: 0,
          growth: 0,
        })),
      );
    if (cmd.type === 'edit') {
      const p = c.students.find((p) => p.id === cmd.studentId);
      if (!p) throw new Error('找不到學生。');
      Object.assign(p, {
        name: requireText(cmd.name, 40),
        group: cmd.group.trim(),
        pet: cmd.pet,
      });
    }
    if (cmd.type === 'remove')
      c.students = c.students.filter((p) => p.id !== cmd.studentId);
    if (cmd.type === 'delete-class') {
      s.classes = s.classes.filter((p) => p.id !== c.id);
      s.activities = s.activities.filter((e) => e.classId !== c.id);
    }
    if (cmd.type === 'act') {
      if (s.activities.some((e) => e.id === cmd.id)) return s;
      const ids = [...new Set(cmd.ids)];
      if (!ids.length) throw new Error('請先選擇學生。');
      const points =
        cmd.kind === 'score' ? cmd.delta! : cmd.kind === 'exchange' ? -5 : 0;
      const food = cmd.kind === 'exchange' ? 1 : cmd.kind === 'feed' ? -1 : 0;
      const growth = cmd.kind === 'feed' ? 5 : 0;
      if (
        !Number.isInteger(points) ||
        Math.abs(points) > 100 ||
        (cmd.kind === 'score' && points === 0)
      )
        throw new Error('每次加減分須為 -100 到 100 的非零整數。');
      const students = ids.map((id) => {
        const p = c.students.find((p) => p.id === id);
        if (!p) throw new Error('名單已更新，請重新選取學生。');
        return p;
      });
      for (const p of students) {
        if (p.points + points < 0)
          throw new Error(`${p.name} 的積分不足，本次操作尚未儲存。`);
        if (p.food + food < 0)
          throw new Error(`${p.name} 沒有食物，請先兌換。`);
        p.points += points;
        p.food += food;
        p.growth += growth;
      }
      s.activities.unshift({
        id: cmd.id,
        classId: c.id,
        students: students.map((p) => ({ id: p.id, name: p.name })),
        points,
        food,
        growth,
        reason: requireText(cmd.reason),
        at: cmd.at,
        undone: false,
      });
    }
  }
  validateClassState(s);
  return s;
}
export function petLevel(growth: number) {
  return {
    level: Math.floor(growth / 20) + 1,
    progress: growth % 20,
    next: 20 - (growth % 20),
  };
}
export function classroomCsv(c: Classroom) {
  const cell = (v: string | number) =>
    `"${String(v)
      .replace(/^[\s\u0000-\u001f]*[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  return (
    '\uFEFF' +
    [
      ['姓名', '小組', '積分', '食物', '成長值', '等級'],
      ...c.students.map((p) => [
        p.name,
        p.group,
        p.points,
        p.food,
        p.growth,
        petLevel(p.growth).level,
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}
