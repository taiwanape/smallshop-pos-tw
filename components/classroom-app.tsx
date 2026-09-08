'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Carrot,
  Check,
  ChevronRight,
  Download,
  History,
  LayoutGrid,
  Leaf,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  Settings2,
  Shuffle,
  Sprout,
  Star,
  Trophy,
  Undo2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  PETS,
  classroomCsv,
  emptyClassState,
  parseClassBackup,
  petLevel,
} from '@/lib/classroom-domain';
import type { ClassState, Command, Student } from '@/lib/classroom-domain';
import {
  commitClassCommand,
  importClassState,
  openClassStore,
  readClassState,
} from '@/lib/classroom-store';

function Choice({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
    >
      <SelectTrigger aria-label={label} className="class-select">
        <SelectValue>
          {options.find((o) => o.value === value)?.label ?? label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function download(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const uid = () => crypto.randomUUID();
const sampleNames = [
  '小安',
  '小晴',
  '小宇',
  '小米',
  '小恩',
  '小樂',
  '小唯',
  '小辰',
  '小希',
  '小森',
  '小可',
  '小羽',
];
const reasons = [
  { text: '認真參與', delta: 1, icon: '🙋' },
  { text: '完成任務', delta: 2, icon: '✅' },
  { text: '幫助同學', delta: 3, icon: '🤝' },
  { text: '主動挑戰', delta: 5, icon: '🌟' },
];

export default function ClassroomApp() {
  const [state, setState] = useState<ClassState>(emptyClassState);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState('');
  const [tab, setTab] = useState('students');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<
    'new' | 'add' | 'settings' | 'help' | 'draw' | null
  >(null);
  const [className, setClassName] = useState('');
  const [names, setNames] = useState('');
  const [edit, setEdit] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'class' | 'student';
    id: string;
    name: string;
  } | null>(null);
  const [delta, setDelta] = useState('1');
  const [reason, setReason] = useState('');
  const [drawn, setDrawn] = useState<Student | null>(null);
  const [pendingImport, setPendingImport] = useState<ClassState | null>(null);
  const db = useRef<IDBDatabase | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const upload = useRef<HTMLInputElement | null>(null);
  const inFlight = useRef(false);
  const current =
    state.classes.find((c) => c.id === active) ?? state.classes[0];
  const students = current?.students ?? [];
  const currentId = current?.id ?? '';
  const visible = useMemo(
    () =>
      students.filter(
        (p) =>
          (group === 'all' || p.group === group) &&
          p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      ),
    [students, group, search],
  );
  const selectedStudents = students.filter((p) => selected.includes(p.id));
  const activities = state.activities.filter((e) => e.classId === currentId);
  const groups = [...new Set(students.map((p) => p.group).filter(Boolean))];

  useEffect(() => {
    let alive = true;
    let opened: IDBDatabase | null = null;
    const refresh = async () => {
      if (db.current && !inFlight.current) {
        try {
          const next = await readClassState(db.current);
          if (alive) setState(next);
        } catch (e) {
          if (alive) setError(String(e instanceof Error ? e.message : e));
        }
      }
    };
    openClassStore()
      .then(async (value) => {
        opened = value;
        if (!alive) {
          value.close();
          return;
        }
        db.current = value;
        const next = await readClassState(value);
        if (alive) {
          setState(next);
          setReady(true);
        }
      })
      .catch((e) => {
        if (alive)
          setError(
            `無法讀取本機資料：${e instanceof Error ? e.message : String(e)}。請允許瀏覽器儲存空間後重新整理。`,
          );
      });
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('daily-tools-classroom');
      channel.current.onmessage = () => void refresh();
    }
    window.addEventListener('focus', refresh);
    return () => {
      alive = false;
      opened?.close();
      db.current = null;
      channel.current?.close();
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => {
    setSelected([]);
    setSearch('');
    setGroup('all');
    setDrawn(null);
    setModal(null);
    setEdit(null);
    setDeleteTarget(null);
  }, [currentId]);
  useEffect(() => {
    setError('');
  }, [modal, edit?.id, deleteTarget?.id, pendingImport]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);
  async function run(command: Command, success: string) {
    if (!db.current || inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await commitClassCommand(db.current, command);
      setState(next);
      channel.current?.postMessage('changed');
      setMessage(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function act(
    kind: 'score' | 'exchange' | 'feed',
    amount = 0,
    label = '',
    ids = selectedStudents.map((p) => p.id),
  ) {
    return run(
      {
        type: 'act',
        id: uid(),
        classId: currentId,
        ids,
        kind,
        delta: amount,
        reason: label || (kind === 'exchange' ? '兌換食物' : '餵養小夥伴'),
        at: new Date().toISOString(),
      },
      kind === 'score'
        ? `已替 ${ids.length} 位學生${amount > 0 ? '加' : '減'} ${Math.abs(amount)} 分。`
        : kind === 'exchange'
          ? `已替 ${ids.length} 位學生兌換食物。`
          : `${ids.length} 位小夥伴獲得 5 點成長值！`,
    );
  }
  async function create(sample = false) {
    const id = uid();
    if (
      await run(
        {
          type: 'create',
          id,
          name: sample ? '範例班級' : className,
          names: sample
            ? sampleNames
            : names
                .split(/\r?\n/)
                .map((v) => v.trim())
                .filter(Boolean),
        },
        sample ? '範例班級已準備好，可以試著加 5 分。' : '班級已建立。',
      )
    ) {
      setActive(id);
      setModal(null);
      setNames('');
      setClassName('');
    }
  }
  function pick() {
    const pool = selectedStudents.length ? selectedStudents : visible;
    if (!pool.length) return;
    const random = new Uint32Array(1);
    const limit = Math.floor(4294967296 / pool.length) * pool.length;
    do {
      crypto.getRandomValues(random);
    } while (random[0] >= limit);
    setDrawn(pool[random[0] % pool.length]);
    setModal('draw');
  }
  async function importFile(file: File) {
    try {
      if (file.size > 20000000) throw new Error('備份檔超過 20 MB。');
      const next = parseClassBackup(await file.text());
      if (!next.classes.length) throw new Error('備份沒有任何班級。');
      setPendingImport(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : '無法讀取檔案。');
    }
  }
  async function confirmImport() {
    if (!db.current || !pendingImport || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const prefix = uid();
      setState(await importClassState(db.current, pendingImport, prefix));
      setActive(`${prefix}-c0`);
      setPendingImport(null);
      channel.current?.postMessage('changed');
      setMessage('已匯入為新班級，原有資料完整保留。');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="class-app">
      <div className="class-heading">
        <div>
          <div className="suite-eyebrow">
            <span className="class-leaf">
              <Leaf />
            </span>
            CLASS COMPANIONS
          </div>
          <h1>班級小夥伴</h1>
          <p>記錄努力，陪伴每一個小小的進步。</p>
        </div>
        <div className="class-heading-actions">
          <button className="class-btn" onClick={() => setModal('help')}>
            <BookOpen />
            使用說明
          </button>
          <button
            className="class-btn class-primary"
            disabled={!ready || busy}
            onClick={() => {
              setClassName('');
              setNames('');
              setModal('new');
            }}
          >
            <Plus />
            建立班級
          </button>
        </div>
      </div>
      {error && (
        <div className="class-error" role="alert">
          {error}
          <button aria-label="關閉錯誤訊息" onClick={() => setError('')}>
            <X />
          </button>
        </div>
      )}
      <div className="class-toast" role="status" aria-live="polite">
        {message && (
          <>
            <Check />
            {message}
          </>
        )}
      </div>
      {!ready ? (
        <div className="class-empty">
          <LoaderCircle />
          <h2>{error ? '尚未能開啟班級資料' : '正在開啟班級…'}</h2>
        </div>
      ) : !current ? (
        <div className="class-onboard">
          <span className="class-welcome-pet" aria-hidden="true">
            🦊
          </span>
          <span className="suite-eyebrow">每個班級，都值得一群小夥伴。</span>
          <h2>從你的第一個班級開始</h2>
          <p>
            貼上學生名單，就能加分、兌換食物，
            <br />
            陪小夥伴一起長大。
          </p>
          <div>
            <button
              className="class-btn class-primary"
              onClick={() => {
                setNames('');
                setClassName('');
                setModal('new');
              }}
            >
              <Plus />
              建立我的班級
            </button>
            <button
              className="class-btn"
              disabled={busy}
              onClick={() => void create(true)}
            >
              先用範例試試
              <ArrowRight />
            </button>
          </div>
          <button
            className="class-text-btn"
            onClick={() => upload.current?.click()}
          >
            <Upload />
            已有備份？匯入班級
          </button>
        </div>
      ) : (
        <>
          <div className="class-toolbar">
            <Choice
              value={currentId}
              options={state.classes.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              onChange={setActive}
              label="選擇班級"
            />
            <span className="class-student-count">
              <Users />
              {students.length} 位學生
            </span>
            <div className="class-toolbar-end">
              <span className="class-save-indicator">
                <span />
                {busy ? '儲存中…' : '已儲存於此瀏覽器'}
              </span>
              <button
                className="class-btn"
                onClick={() => {
                  setClassName(current.name);
                  setModal('settings');
                }}
              >
                <Settings2 />
                管理與備份
              </button>
            </div>
          </div>
          <div className="class-summary">
            <div>
              <span>
                <Users />
                班級夥伴
              </span>
              <strong>
                {students.length}
                <small>位</small>
              </strong>
            </div>
            <div>
              <span>
                <Star />
                可用積分
              </span>
              <strong>
                {students.reduce((sum, p) => sum + p.points, 0)}
                <small>分</small>
              </strong>
            </div>
            <div>
              <span>
                <Sprout />
                累積成長
              </span>
              <strong>
                {students.reduce((sum, p) => sum + p.growth, 0)}
                <small>點</small>
              </strong>
            </div>
            <div className="class-summary-tip">
              <Carrot />
              <p>
                <strong>5 積分 = 1 份食物</strong>
                <span>每次餵食 +5 成長，每 20 點升一級。</span>
              </p>
            </div>
          </div>
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(String(v))}
            className="class-tabs"
          >
            <div className="class-tabbar">
              <TabsList variant="line">
                <TabsTrigger value="students">
                  <LayoutGrid />
                  學生夥伴
                </TabsTrigger>
                <TabsTrigger value="ranking">
                  <Trophy />
                  成長排行
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History />
                  操作紀錄
                </TabsTrigger>
              </TabsList>
              <button
                className="class-btn"
                disabled={!visible.length}
                onClick={pick}
              >
                <Shuffle />
                隨機點名
              </button>
            </div>
            <TabsContent value="students">
              <div className="class-workspace">
                <section className="class-roster">
                  <div className="class-filter">
                    <label className="class-search">
                      <Search />
                      <input
                        aria-label="搜尋學生"
                        placeholder="搜尋學生姓名"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <Choice
                      value={group}
                      onChange={setGroup}
                      label="篩選小組"
                      options={[
                        { value: 'all', label: '所有小組' },
                        ...groups.map((g) => ({ value: g, label: g })),
                      ]}
                    />
                    <button
                      className="class-btn"
                      onClick={() => {
                        setNames('');
                        setModal('add');
                      }}
                    >
                      <Plus />
                      加入學生
                    </button>
                  </div>
                  <div className="class-selection">
                    <label>
                      <Checkbox
                        checked={
                          visible.length > 0 &&
                          visible.every((p) => selected.includes(p.id))
                        }
                        onCheckedChange={(v) =>
                          setSelected(
                            v
                              ? [
                                  ...new Set([
                                    ...selected,
                                    ...visible.map((p) => p.id),
                                  ]),
                                ]
                              : selected.filter(
                                  (id) => !visible.some((p) => p.id === id),
                                ),
                          )
                        }
                      />
                      <span>選取目前顯示的學生</span>
                    </label>
                    <button
                      className="class-text-btn"
                      disabled={!selected.length}
                      onClick={() => setSelected([])}
                    >
                      清除選取
                    </button>
                  </div>
                  {!visible.length ? (
                    <div className="class-empty">
                      <Users />
                      <h3>
                        {students.length
                          ? '找不到符合條件的學生'
                          : '班級裡還沒有學生'}
                      </h3>
                      <p>
                        {students.length
                          ? '試試其他姓名或小組。'
                          : '按「加入學生」，可以一次貼上整班名單。'}
                      </p>
                    </div>
                  ) : (
                    <div className="class-grid">
                      {visible.map((p, index) => {
                        const level = petLevel(p.growth);
                        const checked = selected.includes(p.id);
                        return (
                          <article
                            className={`class-student ${checked ? 'is-selected' : ''}`}
                            key={p.id}
                          >
                            <div className="class-card-top">
                              <span>
                                {String(students.indexOf(p) + 1).padStart(
                                  2,
                                  '0',
                                )}{' '}
                                <small>{p.group || '未分組'}</small>
                              </span>
                              <Checkbox
                                aria-label={`選取${p.name}`}
                                checked={checked}
                                onCheckedChange={(v) =>
                                  setSelected(
                                    v
                                      ? [...selected, p.id]
                                      : selected.filter((id) => id !== p.id),
                                  )
                                }
                              />
                            </div>
                            <button
                              className={`class-pet class-pet-${p.pet % 4}`}
                              aria-label={`選取${p.name}的小夥伴`}
                              aria-pressed={checked}
                              onClick={() =>
                                setSelected(
                                  checked
                                    ? selected.filter((id) => id !== p.id)
                                    : [...selected, p.id],
                                )
                              }
                            >
                              <span aria-hidden="true">{PETS[p.pet]}</span>
                              <b>Lv. {level.level}</b>
                            </button>
                            <button
                              className="class-student-name"
                              onClick={() => setEdit({ ...p })}
                            >
                              {p.name}
                              <Settings2 />
                            </button>
                            <div className="class-growth">
                              <span>
                                成長 <b>{level.progress} / 20</b>
                              </span>
                              <progress
                                max={20}
                                value={level.progress}
                                aria-label={`${p.name}距離下次升級的成長`}
                              />
                            </div>
                            <div className="class-card-points">
                              <span>
                                <Star />
                                {p.points}
                                <small>積分</small>
                              </span>
                              <span>
                                <Carrot />
                                {p.food}
                                <small>食物</small>
                              </span>
                            </div>
                            <div className="class-quick-actions">
                              <button
                                disabled={busy}
                                onClick={() =>
                                  void act('score', 1, '認真參與', [p.id])
                                }
                                aria-label={`${p.name}加 1 分`}
                              >
                                <Plus />1 分
                              </button>
                              <button
                                disabled={busy || p.food < 1}
                                onClick={() =>
                                  void act('feed', 0, '餵養小夥伴', [p.id])
                                }
                                aria-label={`餵養${p.name}的小夥伴`}
                              >
                                <Carrot />
                                餵食
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
                <aside className="class-action-panel">
                  <div className="class-action-heading">
                    <div>
                      <span className="suite-eyebrow">一起進步</span>
                      <h2>課堂鼓勵</h2>
                    </div>
                    <span className="class-selection-badge">
                      {selectedStudents.length} 位
                    </span>
                  </div>
                  <p className="class-selection-description">
                    {selectedStudents.length
                      ? selectedStudents.map((p) => p.name).join('、')
                      : '先選擇學生，就能批次加分或餵食。'}
                  </p>
                  <fieldset disabled={busy || !selectedStudents.length}>
                    <div className="class-reasons">
                      {reasons.map((r) => (
                        <button
                          key={r.text}
                          onClick={() => void act('score', r.delta, r.text)}
                        >
                          <span>
                            {r.icon} {r.text}
                          </span>
                          <b>+{r.delta}</b>
                        </button>
                      ))}
                    </div>
                    <div className="class-custom-score">
                      <label>
                        自訂加減分
                        <div>
                          <input
                            aria-label="分數"
                            type="number"
                            min={-100}
                            max={100}
                            value={delta}
                            onChange={(e) => setDelta(e.target.value)}
                          />
                          <input
                            aria-label="加減分原因"
                            maxLength={80}
                            placeholder="填寫原因"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                        </div>
                      </label>
                      <button
                        className="class-btn"
                        onClick={() =>
                          void act('score', Number(delta), reason || '自訂評分')
                        }
                      >
                        <Check />
                        套用分數
                      </button>
                    </div>
                    <div className="class-feed-panel">
                      <div>
                        <Carrot />
                        <h3>照顧小夥伴</h3>
                      </div>
                      <button
                        className="class-btn"
                        onClick={() => void act('exchange')}
                      >
                        <span>
                          兌換 1 份食物<small>每位扣 5 積分</small>
                        </span>
                        <ChevronRight />
                      </button>
                      <button
                        className="class-btn class-primary"
                        onClick={() => void act('feed')}
                      >
                        <span>
                          餵養小夥伴<small>每位用 1 食物，+5 成長</small>
                        </span>
                        <Sprout />
                      </button>
                    </div>
                  </fieldset>
                  <p className="class-action-note">
                    操作成功才保存。加錯分或點錯了，可到「操作紀錄」撤銷。
                  </p>
                </aside>
              </div>
            </TabsContent>
            <TabsContent value="ranking">
              <div className="class-ranking">
                <div>
                  <span className="suite-eyebrow">一步一步，慢慢長大。</span>
                  <h2>小夥伴成長排行</h2>
                  <p>依累積成長排序；花掉積分兌換食物，不會讓成長倒退。</p>
                </div>
                {!students.length ? (
                  <p>加入學生後，這裡就會出現小夥伴。</p>
                ) : (
                  <ol>
                    {[...students]
                      .sort(
                        (a, b) =>
                          b.growth - a.growth ||
                          a.name.localeCompare(b.name, 'zh-TW'),
                      )
                      .map((p, i) => (
                        <li key={p.id}>
                          <span className="class-rank">{i + 1}</span>
                          <span className="class-rank-pet">{PETS[p.pet]}</span>
                          <div>
                            <strong>{p.name}</strong>
                            <small>
                              {p.group || '未分組'} · Lv.{' '}
                              {petLevel(p.growth).level}
                            </small>
                          </div>
                          <b>
                            {p.growth}
                            <small>成長</small>
                          </b>
                          <span>{p.points} 積分</span>
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            </TabsContent>
            <TabsContent value="history">
              <div className="class-history">
                <div className="class-history-head">
                  <div>
                    <h2>每一次努力，都有紀錄。</h2>
                    <p>
                      保留加減分、兌換與餵食紀錄。已使用的食物，需先撤銷餵食才能撤銷兌換。
                    </p>
                  </div>
                  <button
                    className="class-btn"
                    onClick={() =>
                      download(
                        '班級小夥伴備份.json',
                        JSON.stringify(state, null, 2),
                      )
                    }
                  >
                    <Download />
                    完整備份
                  </button>
                </div>
                {!activities.length ? (
                  <div className="class-empty">
                    <History />
                    <h3>還沒有紀錄</h3>
                    <p>從替學生加第一分開始吧。</p>
                  </div>
                ) : (
                  <ul>
                    {activities.slice(0, 200).map((e) => (
                      <li key={e.id} className={e.undone ? 'class-undone' : ''}>
                        <span className="class-history-icon">
                          {e.growth ? (
                            <Sprout />
                          ) : e.food ? (
                            <Carrot />
                          ) : (
                            <Star />
                          )}
                        </span>
                        <div>
                          <strong>{e.reason}</strong>
                          <p>{e.students.map((p) => p.name).join('、')}</p>
                          <small>
                            {new Date(e.at).toLocaleString('zh-TW', {
                              timeZone: 'Asia/Taipei',
                            })}{' '}
                            · 每位
                            {e.points !== 0
                              ? ` ${e.points > 0 ? '+' : ''}${e.points} 積分`
                              : ''}
                            {e.food !== 0
                              ? ` ${e.food > 0 ? '+' : ''}${e.food} 食物`
                              : ''}
                            {e.growth ? ` +${e.growth} 成長` : ''}
                          </small>
                        </div>
                        <button
                          className="class-btn"
                          disabled={busy || e.undone}
                          onClick={() =>
                            void run(
                              { type: 'undo', id: e.id },
                              '已撤銷這筆操作。',
                            )
                          }
                        >
                          <Undo2 />
                          {e.undone ? '已撤銷' : '撤銷'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {activities.length > 200 && (
                  <p>顯示最近 200 筆；完整紀錄包含在備份中。</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
      <input
        hidden
        ref={upload}
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void importFile(file);
        }}
      />
      <footer className="class-footer">
        <span>
          <span />
          資料僅儲存於此瀏覽器
        </span>
        <button
          className="class-text-btn"
          disabled={!ready || busy}
          onClick={() => upload.current?.click()}
        >
          <Upload />
          匯入備份
        </button>
        <button
          className="class-text-btn"
          disabled={!ready || busy}
          onClick={() =>
            download('班級小夥伴備份.json', JSON.stringify(state, null, 2))
          }
        >
          <Download />
          匯出備份
        </button>
      </footer>

      <Dialog
        open={modal === 'new' || modal === 'add'}
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
      >
        <DialogContent className="class-dialog">
          <DialogHeader>
            <DialogTitle>
              {modal === 'new' ? '建立班級' : '加入學生'}
            </DialogTitle>
            <DialogDescription>
              一行一位學生，最多 200 人。你可以之後再修改名字、小組和寵物。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="class-modal-error" role="alert">
              {error}
            </p>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (modal === 'new') {
                await create();
                return;
              }
              const entries = names
                .split(/\r?\n/)
                .map((v) => v.trim())
                .filter(Boolean);
              if (!entries.length) {
                setError('請輸入至少一位學生。');
                return;
              }
              if (
                await run(
                  {
                    type: 'add',
                    classId: currentId,
                    students: entries.map((name, i) => ({
                      id: uid(),
                      name,
                      group: '',
                      pet: (students.length + i) % PETS.length,
                    })),
                  },
                  '學生已加入。',
                )
              )
                setModal(null);
            }}
          >
            {modal === 'new' && (
              <label>
                班級名稱
                <input
                  required
                  maxLength={80}
                  placeholder="例如：五年三班"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </label>
            )}
            <label>
              學生姓名（每行一位）
              <textarea
                required={modal === 'add'}
                rows={7}
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder={'王小安\n陳小晴\n林小宇'}
              />
            </label>
            <p>
              目前輸入 {names.split(/\r?\n/).filter((v) => v.trim()).length}{' '}
              位學生
            </p>
            <button
              className="class-btn class-primary"
              disabled={busy}
              type="submit"
            >
              {busy ? '儲存中…' : modal === 'new' ? '建立班級' : '加入學生'}
              <ArrowRight />
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(edit)}
        onOpenChange={(v) => {
          if (!v) setEdit(null);
        }}
      >
        <DialogContent className="class-dialog">
          <DialogHeader>
            <DialogTitle>學生與小夥伴</DialogTitle>
            <DialogDescription>
              更换寵物會保留原有的積分、食物和成長值。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="class-modal-error" role="alert">
              {error}
            </p>
          )}
          {edit && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await run(
                    {
                      type: 'edit',
                      classId: currentId,
                      studentId: edit.id,
                      name: edit.name,
                      group: edit.group,
                      pet: edit.pet,
                    },
                    '學生資料已更新。',
                  )
                )
                  setEdit(null);
              }}
            >
              <label>
                姓名
                <input
                  required
                  maxLength={40}
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </label>
              <label>
                小組
                <input
                  maxLength={40}
                  placeholder="例如：第一組（可留白）"
                  value={edit.group}
                  onChange={(e) => setEdit({ ...edit, group: e.target.value })}
                />
              </label>
              <label>選擇小夥伴</label>
              <div className="class-pet-options">
                {PETS.map((pet, i) => (
                  <button
                    type="button"
                    key={pet}
                    aria-label={`小夥伴 ${i + 1}`}
                    aria-pressed={edit.pet === i}
                    onClick={() => setEdit({ ...edit, pet: i })}
                  >
                    {pet}
                  </button>
                ))}
              </div>
              <div className="class-dialog-actions">
                <button
                  type="button"
                  className="class-text-btn class-danger"
                  onClick={() => {
                    setDeleteTarget({
                      kind: 'student',
                      id: edit.id,
                      name: edit.name,
                    });
                    setEdit(null);
                  }}
                >
                  移除學生
                </button>
                <button className="class-btn class-primary" disabled={busy}>
                  儲存
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'settings'}
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
      >
        <DialogContent className="class-dialog">
          <DialogHeader>
            <DialogTitle>班級管理與備份</DialogTitle>
            <DialogDescription>
              備份包含所有班級、學生、寵物及操作紀錄。換裝置前請先下載。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="class-modal-error" role="alert">
              {error}
            </p>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run(
                  { type: 'rename', classId: currentId, name: className },
                  '班級名稱已更新。',
                )
              )
                setModal(null);
            }}
          >
            <label>
              班級名稱
              <input
                required
                maxLength={80}
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
            </label>
            <button className="class-btn class-primary" disabled={busy}>
              儲存名稱
            </button>
          </form>
          <div className="class-settings-actions">
            <button
              className="class-btn"
              onClick={() =>
                download('班級小夥伴備份.json', JSON.stringify(state, null, 2))
              }
            >
              <Download />
              下載全部班級備份
            </button>
            <button
              className="class-btn"
              onClick={() => {
                if (current)
                  download(
                    `${current.name.replace(/[\\/:*?"<>|]/g, '-')}-成績.csv`,
                    classroomCsv(current),
                    'text/csv;charset=utf-8',
                  );
              }}
            >
              <Download />
              匯出這一班 CSV
            </button>
            <button
              className="class-btn"
              onClick={() => {
                setModal(null);
                upload.current?.click();
              }}
            >
              <Upload />
              匯入備份為新班級
            </button>
            <button
              className="class-text-btn class-danger"
              onClick={() => {
                if (current) {
                  setDeleteTarget({
                    kind: 'class',
                    id: currentId,
                    name: current.name,
                  });
                  setModal(null);
                }
              }}
            >
              刪除這個班級
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'help'}
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
      >
        <DialogContent className="class-dialog">
          <DialogHeader>
            <DialogTitle>讓每一次進步被看見</DialogTitle>
            <DialogDescription>
              三個步驟，開始你的班級養成日常。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="class-modal-error" role="alert">
              {error}
            </p>
          )}
          <ol className="class-help">
            <li>
              <b>1</b>
              <div>
                <strong>選擇學生，給予積分</strong>
                <p>
                  勾選一人、多位或全班，選擇評分項目；也能輸入正負分與原因。積分不會扣成負數。
                </p>
              </div>
            </li>
            <li>
              <b>2</b>
              <div>
                <strong>用積分兌換食物</strong>
                <p>
                  每位學生用自己的 5 積分換 1
                  份食物。批次操作若有人不足，整批都不會扣款。
                </p>
              </div>
            </li>
            <li>
              <b>3</b>
              <div>
                <strong>餵食，讓小夥伴成長</strong>
                <p>
                  1 份食物增加 5 成長值。每累積 20 點升一級，等級會持續增加。
                </p>
              </div>
            </li>
          </ol>
          <p>
            點學生姓名可改名、設定小組與換寵物。所有資料保存在此瀏覽器；「管理與備份」可下載完整
            JSON 或班級 CSV。
          </p>
          <p>
            這是依影片的班級積分與寵物養成概念自行設計的工具。未提供家長端、雲端同步、付費訂閱或商用驗收。
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'draw'}
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
      >
        <DialogContent className="class-dialog class-draw">
          <DialogHeader>
            <DialogTitle>這次，換你試試！</DialogTitle>
            <DialogDescription>
              從{selectedStudents.length ? '已選取' : '目前篩選'}的{' '}
              {selectedStudents.length || visible.length}{' '}
              位學生中隨機選出，每次都有機會重複。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="class-modal-error" role="alert">
              {error}
            </p>
          )}
          {drawn && (
            <>
              <span className="class-draw-pet">{PETS[drawn.pet]}</span>
              <h2>{drawn.name}</h2>
              <div className="class-dialog-actions">
                <button className="class-btn" onClick={pick}>
                  <Shuffle />
                  再抽一次
                </button>
                <button
                  className="class-btn class-primary"
                  disabled={busy}
                  onClick={async () => {
                    if (await act('score', 1, '點名參與', [drawn.id]))
                      setModal(null);
                  }}
                >
                  <Plus />
                  鼓勵 1 分
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="class-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>移除「{deleteTarget?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'class'
                ? '這個班級的學生與全部操作紀錄都會刪除，無法復原。'
                : '學生的積分、食物與成長資料會移除，歷史操作會保留，但涉及這位學生的紀錄將無法撤銷。'}
              建議先匯出備份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="class-modal-error" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>保留</AlertDialogCancel>
            <button
              className="class-btn class-danger"
              disabled={busy}
              onClick={async () => {
                if (!deleteTarget) return;
                const cmd: Command =
                  deleteTarget.kind === 'class'
                    ? { type: 'delete-class', classId: deleteTarget.id }
                    : {
                        type: 'remove',
                        classId: currentId,
                        studentId: deleteTarget.id,
                      };
                if (await run(cmd, '已移除。')) setDeleteTarget(null);
              }}
            >
              確認移除
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(pendingImport)}
        onOpenChange={(v) => {
          if (!v) setPendingImport(null);
        }}
      >
        <AlertDialogContent className="class-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              匯入 {pendingImport?.classes.length} 個班級？
            </AlertDialogTitle>
            <AlertDialogDescription>
              將新增{' '}
              {pendingImport?.classes.reduce(
                (n, c) => n + c.students.length,
                0,
              )}{' '}
              位學生，保留備份中的積分、食物、成長與歷史紀錄。班級名稱加上「匯入」，不會覆蓋目前資料。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="class-modal-error" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <button
              className="class-btn class-primary"
              disabled={busy}
              onClick={() => void confirmImport()}
            >
              確認匯入
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
