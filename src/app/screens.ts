import { ACHIEVEMENTS } from '../game/achievements';
import { track } from '../analytics';
import type { SaveStore } from '../game/SaveStore';
import type { SoundBank } from '../audio/SoundBank';
import { allLevels, nextLevel } from '../levels/registry';
import { CHAPTERS } from '../levels/chapters';
import { currentLevelId, PROGRESSION } from '../game/progression';
import { pigFaces } from '../render/illustrations';
import { botStickerImage } from '../render/botArt';
import { iconSvg } from '../ui/icons';
import { Hud } from '../ui/Hud';
import { PauseMenu } from '../ui/PauseMenu';
import { ResultsPanel } from '../ui/ResultsPanel';
import { TitleScreen } from '../ui/TitleScreen';
import { LevelSelect } from '../ui/LevelSelect';
import { Settings } from '../ui/Settings';
import { Credits } from '../ui/Credits';
import { AchievementsScreen } from '../ui/Achievements';
import { BotIntro } from '../ui/BotIntro';

export type AppPhase = 'title' | 'levelSelect' | 'play';

type ScreensDeps = {
  save: SaveStore;
  audio: SoundBank;
  unlockAll: boolean;
  getPhase: () => AppPhase;
  setPhase: (p: AppPhase) => void;
  getLevelId: () => string | null;
  startLevel: (id: string) => void;
  startDaily: () => void;
  dailyLevelName: () => string;
  restartLevel: () => void;
  togglePause: (force?: boolean) => void;
  leavePlay: () => void;
  isLevelUnlocked: (id: string) => boolean;
  levelRefs: () => readonly { id: string; chapter: string }[];
  applyAimGuide: () => void;
};

export function botImage(kind: string): string {
  return botStickerImage(kind as Parameters<typeof botStickerImage>[0]);
}

export function pigImage(): string {
  const tex = pigFaces(false, 'none').smug;
  const img = tex.image as HTMLCanvasElement;
  return img?.toDataURL?.() ?? '';
}

export function tipFor(def: { id: string; bots: string[] }): string {
  if (def.id === 'first-flight') return 'Pull back and release. Drag to the perch to cancel.';
  if (def.bots[0] === 'dash') return 'Tap during flight to dash.';
  if (def.bots.includes('split')) return 'Glass breaks easily. Tap to split in mid-air.';
  return 'Clear every target.';
}

/**
 * Owns the DOM screens (title, level select, modals) and the navigation
 * flow between them. App keeps sim/pause state and hands in callbacks.
 */
export class AppScreens {
  readonly hud: Hud;
  readonly pauseMenu: PauseMenu;
  readonly results: ResultsPanel;
  readonly title: TitleScreen;
  readonly levelSelect: LevelSelect;
  readonly settings: Settings;
  readonly credits: Credits;
  readonly achvScreen: AchievementsScreen;
  readonly botIntro: BotIntro;
  private readonly uiRoot: HTMLElement;
  private readonly deps: ScreensDeps;

  constructor(uiRoot: HTMLElement, deps: ScreensDeps) {
    this.uiRoot = uiRoot;
    this.deps = deps;
    this.hud = new Hud(
      uiRoot,
      () => deps.togglePause(),
      () => this.toggleMute()
    );
    this.hud.setMuted(deps.audio.muted);
    this.pauseMenu = new PauseMenu(uiRoot, {
      resume: () => deps.togglePause(false),
      restart: () => {
        deps.togglePause(false);
        deps.restartLevel();
      },
      levels: () => this.goLevelSelect(),
      settings: () => this.openSettings(),
      onSettings: (key, value) => this.applySetting(key, value),
    });
    this.results = new ResultsPanel(uiRoot, (a) => this.onResultsAction(a));
    this.title = new TitleScreen(uiRoot, {
      play: () => this.goLevelSelect(),
      daily: () => deps.startDaily(),
      settings: () => this.openSettings(),
      achievements: () => this.openAchievements(),
      credits: () => this.openCredits(),
    });
    this.title.setDaily(deps.dailyLevelName());
    this.levelSelect = new LevelSelect(
      uiRoot,
      (id) => deps.startLevel(id),
      () => this.goTitle()
    );
    this.settings = new Settings(uiRoot, {
      onChange: (key, value) => this.applySetting(key, value),
      onReset: () => {
        this.deps.save.resetProgress();
        this.settings.populate(this.deps.save.settings);
        this.refreshTitleStats();
      },
      onClose: () => this.settings.toggle(false),
    });
    this.credits = new Credits(uiRoot, () => this.credits.toggle(false));
    this.achvScreen = new AchievementsScreen(uiRoot, () =>
      this.achvScreen.toggle(false)
    );
    this.botIntro = new BotIntro(uiRoot);
  }

  /** True when any modal blocks game input. */
  anyModalVisible(): boolean {
    return (
      this.results.isVisible() ||
      this.pauseMenu.isVisible() ||
      this.settings.isVisible() ||
      this.achvScreen.isVisible() ||
      this.credits.isVisible() ||
      this.botIntro.isVisible()
    );
  }

  /** Esc semantics: close topmost modal, back out of level select, else pause. */
  onEscape(): void {
    if (this.settings.isVisible()) {
      this.settings.toggle(false);
      return;
    }
    if (this.credits.isVisible()) {
      this.credits.toggle(false);
      return;
    }
    if (this.achvScreen.isVisible()) {
      this.achvScreen.toggle(false);
      return;
    }
    if (this.deps.getPhase() === 'levelSelect') {
      if (!this.levelSelect.back()) this.goTitle();
      return;
    }
    if (this.deps.getPhase() === 'title') return;
    this.deps.togglePause();
  }

  /** Enter activates the primary button of the topmost open modal. */
  activatePrimary(): void {
    const el = document.activeElement;
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) return;
    const wraps = [...this.uiRoot.querySelectorAll<HTMLElement>('.modal-wrap.open, .results-panel.open')];
    const top = wraps[wraps.length - 1];
    const primary = top?.querySelector<HTMLButtonElement>('.ui-primary');
    primary?.click();
  }

  toggleMute(): void {
    const muted = !this.deps.audio.muted;
    this.deps.audio.muted = muted;
    this.deps.save.settings.muted = muted;
    this.deps.save.persist();
    this.hud.setMuted(muted);
  }

  applySetting(key: string, value: number | boolean | string | null): void {
    const { save, audio } = this.deps;
    if (key === 'music' || key === 'sfx' || key === 'voice') {
      const v = value as number;
      save.settings[key] = v;
      if (key === 'music') audio.setMusicVolume(v);
      if (key === 'sfx') audio.setSfxVolume(v);
      if (key === 'voice') audio.setVoiceVolume(v);
    } else if (key === 'muted') {
      save.settings.muted = Boolean(value);
      audio.muted = save.settings.muted;
    } else if (key === 'reducedMotion') {
      save.settings.reducedMotion = value as boolean | null;
    } else if (key === 'aimGuide') {
      save.settings.aimGuide = value as 'off' | 'short';
      this.deps.applyAimGuide();
    }
    save.persist();
  }

  openSettings(): void {
    this.settings.populate(this.deps.save.settings);
    this.settings.toggle(true);
  }

  openCredits(): void {
    this.credits.toggle(true);
  }

  openAchievements(): void {
    this.achvScreen.populate(this.deps.save.achievements, this.deps.save, this.deps.levelRefs());
    this.achvScreen.toggle(true);
  }

  refreshTitleStats(): void {
    const refs = this.deps.levelRefs();
    this.title.setDaily(this.deps.dailyLevelName());
    this.title.setStats(
      this.deps.save.totalStars(refs),
      refs.length * 3,
      Object.keys(this.deps.save.achievements).length,
      ACHIEVEMENTS.length
    );
  }

  toast(text: string, cls = '', badgeUrl = ''): void {
    const el = document.createElement('div');
    el.className = `ui-toast ${cls}`.trim();
    const icon = badgeUrl
      ? `<img class="toast-badge" alt="" src="${badgeUrl}">`
      : iconSvg('trophy', 20);
    el.innerHTML = `${icon}<span></span>`;
    el.querySelector('span')!.textContent = text;
    this.uiRoot.appendChild(el);
    window.setTimeout(() => el.remove(), 2500);
  }

  goTitle(): void {
    this.deps.leavePlay();
    this.deps.setPhase('title');
    this.deps.audio.setTrack('title');
    this.levelSelect.hide();
    this.results.hide();
    this.hud.hide();
    this.refreshTitleStats();
    this.title.show();
  }

  goLevelSelect(): void {
    this.deps.leavePlay();
    this.deps.setPhase('levelSelect');
    this.deps.audio.setTrack('title');
    this.title.hide();
    this.results.hide();
    const refs = this.deps.levelRefs();
    const { save, unlockAll } = this.deps;
    const artBot: Record<string, string> = {
      training: botImage('grok'),
      workshop: botImage('dash'),
      citadel: botImage('heavy'),
    };
    this.levelSelect.populate(allLevels(), {
      unlocked: (id) => this.deps.isLevelUnlocked(id),
      starsFor: (id) => save.levelProgress(id)?.stars ?? 0,
      chapterUnlocked: (c) => unlockAll || save.isChapterUnlocked(c, refs),
      chapterStars: (c) => save.chapterStars(c, refs),
      chapterGateText: (c) => {
        const order = CHAPTERS.find((x) => x.id === c)?.order ?? 0;
        const prev = CHAPTERS.find((x) => x.order === order - 1);
        const need = PROGRESSION.chapterStars[c] ?? 0;
        return `Clear ${prev?.name ?? 'previous chapter'} 10 · ${need}★ needed`;
      },
      chapterArt: (c) => artBot[c] ?? '',
      currentId: () =>
        currentLevelId(refs, (id) => save.levelProgress(id)),
    });
    this.levelSelect.show();
    this.hud.hide();
  }

  onResultsAction(action: 'retry' | 'next' | 'levels' | 'skip'): void {
    this.results.hide();
    this.deps.audio.play('ui');
    const levelId = this.deps.getLevelId();
    if (action === 'levels') {
      this.goLevelSelect();
      return;
    }
    if (action === 'retry' && levelId) {
      this.deps.restartLevel();
      return;
    }
    if (action === 'skip' && levelId) {
      track('level_skip', { levelId });
      this.deps.save.skipLevel(levelId);
      const n = nextLevel(levelId);
      if (n && this.deps.isLevelUnlocked(n.id)) this.deps.startLevel(n.id);
      else this.goLevelSelect();
      return;
    }
    if (action === 'next' && levelId) {
      const n = nextLevel(levelId);
      if (n) this.deps.startLevel(n.id);
      else this.goLevelSelect();
    }
  }
}
