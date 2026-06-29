import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';

interface DemoCard {
  title: string;
  priority: string;
  progress: number;
}

interface DemoCol {
  name: string;
  tone: string;
  cards: DemoCard[];
}

@Component({
  selector: 'app-mini-kanban-showcase',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mini-kanban">
      <div class="mini-kanban__logo">
        <img src="/icons/icon-192x192.png" alt="Agile Ai" class="mini-kanban__logo-img" />
        <span class="mini-kanban__logo-text">Agile Ai</span>
      </div>

      <div class="mini-kanban__board">
        @for (col of columns(); track col.name + tick(); let i = $index) {
          <div class="mini-kanban__column {{ col.tone }}" [style.animation-delay]="i * 80 + 'ms'">
            <div class="mini-kanban__col-head">
              <span>{{ col.name }}</span>
              <span class="mini-kanban__count">{{ col.cards.length }}</span>
            </div>
            @for (card of col.cards; track card.title + tick()) {
              <article class="mini-kanban__card">
                <span class="mini-kanban__priority">{{ card.priority }}</span>
                <p class="mini-kanban__title">{{ card.title }}</p>
                <div class="mini-kanban__bar"><span [style.width.%]="card.progress"></span></div>
              </article>
            }
          </div>
        }
      </div>

      <p class="mini-kanban__caption">
        <span class="mini-kanban__live" [class.mini-kanban__live--pulse]="livePulse()">Live sync</span>
        Tasks flow from To do → Done
      </p>
    </div>
  `,
  styles: `
    .mini-kanban { width: 100%; max-width: 22rem; margin: 0 auto; }
    .mini-kanban__logo {
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;
    }
    .mini-kanban__logo-img {
      width: 3.5rem; height: 3.5rem; border-radius: 0.85rem;
      animation: mk-logo-pulse 2.4s ease-in-out infinite;
      box-shadow: 0 12px 28px rgba(0,0,0,0.25);
    }
    .mini-kanban__logo-text { font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; }
    .mini-kanban__board {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem;
      padding: 0.65rem; border-radius: 1rem;
      background: rgba(255,255,255,0.08); backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.12);
      animation: mk-board-float 5s ease-in-out infinite;
    }
    .mini-kanban__column {
      border-radius: 0.65rem; padding: 0.4rem; min-height: 6.5rem;
      transition: background 0.4s;
    }
    .tone-todo { background: rgba(252,231,243,0.22); }
    .tone-progress { background: rgba(255,237,213,0.22); }
    .tone-done { background: rgba(237,233,254,0.22); }
    .mini-kanban__col-head {
      display: flex; justify-content: space-between; font-size: 0.55rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em; color: rgba(255,255,255,0.85); margin-bottom: 0.35rem;
    }
    .mini-kanban__count {
      background: rgba(255,255,255,0.2); border-radius: 999px; padding: 0 0.3rem;
    }
    .mini-kanban__card {
      background: rgba(255,255,255,0.95); border-radius: 0.5rem; padding: 0.35rem;
      animation: mk-card-in 0.5s ease-out;
      box-shadow: 0 4px 10px rgba(0,0,0,0.12);
    }
    .mini-kanban__priority { font-size: 0.45rem; font-weight: 700; color: #b54708; text-transform: uppercase; }
    .mini-kanban__title { margin: 0.15rem 0; font-size: 0.55rem; font-weight: 700; color: #101828; line-height: 1.3; }
    .mini-kanban__bar { height: 0.18rem; border-radius: 999px; background: #eaecf0; overflow: hidden; }
    .mini-kanban__bar span {
      display: block; height: 100%; border-radius: inherit;
      background: linear-gradient(90deg, #465fff, #7a5af8);
      transition: width 0.6s ease;
    }
    .mini-kanban__caption {
      margin-top: 0.85rem; text-align: center; font-size: 0.7rem; color: rgba(255,255,255,0.65);
    }
    .mini-kanban__live {
      display: inline-block; margin-right: 0.35rem; padding: 0.1rem 0.45rem; border-radius: 999px;
      background: rgba(16,185,129,0.25); color: #a7f3d0; font-weight: 600; font-size: 0.6rem;
    }
    .mini-kanban__live--pulse { animation: mk-live-pulse 0.65s ease-out; }
    @keyframes mk-logo-pulse {
      0%, 100% { transform: scale(0.96); opacity: 0.85; }
      50% { transform: scale(1); opacity: 1; }
    }
    @keyframes mk-board-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes mk-card-in {
      from { opacity: 0; transform: translateY(8px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes mk-live-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.08); box-shadow: 0 0 0 4px rgba(16,185,129,0.2); }
      100% { transform: scale(1); }
    }
  `,
})
export class MiniKanbanShowcaseComponent implements OnInit, OnDestroy {
  readonly columns = signal<DemoCol[]>([]);
  readonly livePulse = signal(false);
  readonly tick = signal(0);

  private interval?: ReturnType<typeof setInterval>;
  private index = 0;

  private readonly snapshots: DemoCol[][] = [
    [
      { name: 'To do', tone: 'tone-todo', cards: [{ title: 'Auth flow', priority: 'High', progress: 20 }] },
      { name: 'In progress', tone: 'tone-progress', cards: [{ title: 'Kanban board', priority: 'Medium', progress: 55 }] },
      { name: 'Done', tone: 'tone-done', cards: [{ title: 'Sprint API', priority: 'Low', progress: 100 }] },
    ],
    [
      { name: 'To do', tone: 'tone-todo', cards: [{ title: 'Push alerts', priority: 'Medium', progress: 10 }] },
      { name: 'In progress', tone: 'tone-progress', cards: [{ title: 'Auth flow', priority: 'High', progress: 70 }] },
      { name: 'Done', tone: 'tone-done', cards: [{ title: 'Kanban board', priority: 'Medium', progress: 100 }] },
    ],
    [
      { name: 'To do', tone: 'tone-todo', cards: [] },
      { name: 'In progress', tone: 'tone-progress', cards: [{ title: 'Push alerts', priority: 'Medium', progress: 45 }] },
      { name: 'Done', tone: 'tone-done', cards: [{ title: 'Auth flow', priority: 'High', progress: 100 }, { title: 'Sprint API', priority: 'Low', progress: 100 }] },
    ],
  ];

  ngOnInit(): void {
    this.columns.set(structuredClone(this.snapshots[0]));
    this.interval = setInterval(() => this.advance(), 3200);
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
  }

  private advance(): void {
    this.index = (this.index + 1) % this.snapshots.length;
    this.tick.update((v) => v + 1);
    this.livePulse.set(true);
    this.columns.set(structuredClone(this.snapshots[this.index]));
    setTimeout(() => this.livePulse.set(false), 650);
  }
}
