'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ArrowRight,
  Check,
  LogOut,
  Monitor,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { suiteAsset } from '@/lib/suite-paths';

type Member = { id: string; name: string; email: string; created_at: number };
type Session = { user: Member | null; csrfToken: string | null };
type GoogleIdentity = {
  initialize(options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      type: string;
      theme: string;
      size: string;
      text: string;
      shape: string;
      width: number;
      locale: string;
    },
  ): void;
  disableAutoSelect(): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}
const Account = createContext<{
  user: Member | null;
  loading: boolean;
  open: () => void;
}>({ user: null, loading: false, open: () => {} });
let googleLoader: Promise<GoogleIdentity> | undefined;
function loadGoogle() {
  if (window.google?.accounts.id)
    return Promise.resolve(window.google.accounts.id);
  if (!googleLoader)
    googleLoader = new Promise<GoogleIdentity>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      const timer = window.setTimeout(() => fail(), 15000);
      function fail() {
        window.clearTimeout(timer);
        script.remove();
        googleLoader = undefined;
        reject(new Error('Google 登入尚未載入，請檢查網路後再試一次。'));
      }
      script.onerror = fail;
      script.onload = () => {
        window.clearTimeout(timer);
        if (window.google?.accounts.id) resolve(window.google.accounts.id);
        else fail();
      };
      document.head.appendChild(script);
    });
  return googleLoader;
}
async function api<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      body === undefined
        ? undefined
        : {
            'content-type': 'application/json',
            ...(csrf ? { 'x-csrf-token': csrf } : {}),
          },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    if (response.status === 429)
      throw new Error('登入嘗試太頻繁，請等一分鐘再試。');
    if (
      ['login_expired', 'invalid_credential', 'csrf_failed'].includes(
        data.error ?? '',
      )
    )
      throw new Error('這次登入已失效，請重新選擇 Google 帳號。');
    throw new Error('會員服務暫時無法連線，請稍後再試。工具仍可直接使用。');
  }
  return data as T;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    csrfToken: null,
  });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const buttonRef = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const refresh = useCallback(async () => {
    const requestId = ++generation.current;
    try {
      const value = await api<Session>('session');
      if (requestId === generation.current) setSession(value);
    } catch {
      if (requestId === generation.current)
        setSession({ user: null, csrfToken: null });
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('daily-tools-account');
      channel.current.onmessage = () => void refresh();
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      generation.current++;
      channel.current?.close();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  const updateSession = useCallback((value: Session) => {
    generation.current++;
    setSession(value);
    setLoading(false);
    channel.current?.postMessage('changed');
  }, []);
  useEffect(() => {
    if (!open || session.user) return;
    let active = true;
    setError('');
    setReady(false);
    setBusy(false);
    const start = async () => {
      try {
        const [config, google] = await Promise.all([
          api<{ clientId: string; nonce: string }>('config', {}),
          loadGoogle(),
        ]);
        if (!active || !buttonRef.current) return;
        google.initialize({
          client_id: config.clientId,
          nonce: config.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            if (!active) return;
            setBusy(true);
            setError('');
            try {
              const next = await api<Session>(
                'google',
                { credential },
                config.nonce,
              );
              if (active) updateSession(next);
            } catch (e) {
              if (active) {
                setError(
                  e instanceof Error ? e.message : '登入未完成，請重試。',
                );
                setReady(false);
              }
            } finally {
              if (active) setBusy(false);
            }
          },
        });
        buttonRef.current.replaceChildren();
        google.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.min(320, buttonRef.current.clientWidth || 280),
          locale: 'zh_TW',
        });
        setReady(true);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : '登入尚未準備好，請重試。');
      }
    };
    void start();
    return () => {
      active = false;
    };
  }, [open, session.user, attempt, updateSession]);
  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api('logout', {}, session.csrfToken ?? undefined);
      window.google?.accounts.id.disableAutoSelect();
      updateSession({ user: null, csrfToken: null });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '登出未完成，請重試。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Account.Provider
      value={{
        user: session.user,
        loading,
        open: () => {
          setError('');
          setOpen(true);
        },
      }}
    >
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="member-dialog">
          <div className="member-kicker">
            <Sparkles size={16} /> YOUR DAILY CLUB
          </div>
          <div className="member-mark" aria-hidden="true">
            <UserRound size={34} />
            {session.user && (
              <span>
                <Check size={14} />
              </span>
            )}
          </div>
          <DialogTitle className="member-title">
            {session.user
              ? `嗨，${session.user.name}！`
              : '好日常，從這裡開始。'}
          </DialogTitle>
          <DialogDescription className="member-description">
            {session.user
              ? '歡迎回到日常工具所，你已登入會員。'
              : '用 Google 帳號加入。第一次登入，就是註冊。'}
          </DialogDescription>
          {session.user ? (
            <div className="member-profile">
              <span>會員帳號</span>
              <strong>{session.user.email}</strong>
              <small>
                加入於{' '}
                {new Date(session.user.created_at * 1000).toLocaleDateString(
                  'zh-TW',
                )}
              </small>
            </div>
          ) : (
            <div className="member-login-area" aria-busy={busy}>
              {!ready && !error && <p role="status">正在準備 Google 登入…</p>}
              <div
                ref={buttonRef}
                className="member-google-button"
                hidden={!ready || busy}
              />
              {busy && <p role="status">正在確認帳號…</p>}
            </div>
          )}
          {error && (
            <div className="member-error" role="alert">
              <p>{error}</p>
              {!session.user && (
                <button type="button" onClick={() => setAttempt((n) => n + 1)}>
                  重新載入登入
                </button>
              )}
            </div>
          )}
          <div className="member-device-note">
            <Monitor size={20} />
            <p>
              <strong>這個裝置的工具資料</strong>
              <span>
                班級、字卡與訂單保存在本瀏覽器，使用同一瀏覽器的人會共用。切換會員不會切換或同步這些資料。
              </span>
            </p>
          </div>
          {session.user ? (
            <button
              className="member-secondary"
              type="button"
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={16} />
              {busy ? '正在登出…' : '登出會員'}
            </button>
          ) : (
            <DialogClose className="member-secondary">
              先逛逛工具 <ArrowRight size={16} />
            </DialogClose>
          )}
          <a
            className="member-privacy"
            href={suiteAsset('privacy.html')}
            target="_blank"
            rel="noreferrer"
          >
            隱私與資料使用說明 ↗
          </a>
        </DialogContent>
      </Dialog>
    </Account.Provider>
  );
}
export function MemberButton() {
  const account = useContext(Account);
  return (
    <button
      className="suite-member-button"
      onClick={account.open}
      type="button"
      aria-label={account.user ? '開啟會員帳號' : 'Google 登入或註冊會員'}
    >
      <UserRound aria-hidden="true" />
      <span>
        {account.user ? '我的會員' : account.loading ? '會員' : '登入 / 註冊'}
      </span>
    </button>
  );
}
