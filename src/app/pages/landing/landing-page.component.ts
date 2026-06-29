import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ThemeToggleTwoComponent } from '../../shared/components/common/theme-toggle-two/theme-toggle-two.component';
import { ThemeService } from '../../shared/services/theme.service';
import { SplashService } from '../../shared/services/splash.service';

interface LandingFeature {
  title: string;
  desc: string;
  iconPath: string;
}

interface KanbanCard {
  title: string;
  note: string;
  priority: 'High' | 'Medium' | 'Low';
  progress: number;
  assignees: number;
  comments: number;
}

interface KanbanColumn {
  name: string;
  tone: string;
  cards: KanbanCard[];
}

const LANDING_PREV_THEME_KEY = 'agileai-landing-prev-theme';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, ThemeToggleTwoComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
})
export class LandingPageComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly splash = inject(SplashService);
  private readonly router = inject(Router);
  private demoInterval?: ReturnType<typeof setInterval>;
  private snapshotIndex = 0;

  readonly livePulse = signal(false);
  readonly boardTick = signal(0);
  readonly demoColumns = signal<KanbanColumn[]>([]);

  readonly features: LandingFeature[] = [
    {
      title: 'Sprint kanban boards',
      desc: 'Drag-and-drop columns with live SignalR updates, assignee avatars, and progress on every card.',
      iconPath: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z',
    },
    {
      title: 'Backlog & epics',
      desc: 'Structure epics, user stories, MoSCoW priorities, and story points before sprint planning.',
      iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    },
    {
      title: 'AI delivery assistant',
      desc: 'Generate issue descriptions, standup summaries, and sprint risk analysis from your backlog data.',
      iconPath: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    },
    {
      title: 'Real-time notifications',
      desc: 'Bell alerts and board refresh the moment a task moves, a comment lands, or you are assigned.',
      iconPath: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
    {
      title: 'Dashboards & velocity',
      desc: 'Burndown, team workload, and global KPIs for product owners, scrum masters, and admins.',
      iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
    {
      title: 'Files & profile photos',
      desc: 'Attach documents to issues and comments. Upload profile photos shown across tasks and boards.',
      iconPath: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
  ];

  readonly steps = [
    { n: '01', title: 'Create your workspace', desc: 'Set up projects, invite developers, testers, POs, and scrum masters.' },
    { n: '02', title: 'Plan the sprint', desc: 'Pull stories from backlog, assign owners, and open the kanban board.' },
    { n: '03', title: 'Deliver with visibility', desc: 'Track subtasks, comments, attachments, and AI insights until done.' },
  ];

  private readonly boardSnapshots: KanbanColumn[][] = [
    [
      { name: 'To do', tone: 'col-todo', cards: [{ title: 'Design notification banner', note: 'Mobile push + in-app center', priority: 'Medium', progress: 35, assignees: 2, comments: 3 }] },
      { name: 'In progress', tone: 'col-progress', cards: [{ title: 'Kanban drag-and-drop', note: 'Optimistic UI + SignalR sync', priority: 'High', progress: 68, assignees: 3, comments: 5 }] },
      { name: 'In review', tone: 'col-review', cards: [{ title: 'Sprint velocity widget', note: 'Chart.js + dashboard API', priority: 'Medium', progress: 90, assignees: 1, comments: 2 }] },
      { name: 'Done', tone: 'col-done', cards: [{ title: 'JWT authentication', note: 'Role-based guards shipped', priority: 'Low', progress: 100, assignees: 2, comments: 4 }] },
    ],
    [
      { name: 'To do', tone: 'col-todo', cards: [{ title: 'Profile photo upload', note: 'Cloudinary signed URLs', priority: 'Low', progress: 10, assignees: 1, comments: 1 }] },
      { name: 'In progress', tone: 'col-progress', cards: [{ title: 'Design notification banner', note: 'Mobile push + in-app center', priority: 'Medium', progress: 55, assignees: 2, comments: 4 }] },
      { name: 'In review', tone: 'col-review', cards: [{ title: 'Kanban drag-and-drop', note: 'Optimistic UI + SignalR sync', priority: 'High', progress: 92, assignees: 3, comments: 6 }] },
      { name: 'Done', tone: 'col-done', cards: [{ title: 'JWT authentication', note: 'Role-based guards shipped', priority: 'Low', progress: 100, assignees: 2, comments: 4 }] },
    ],
    [
      { name: 'To do', tone: 'col-todo', cards: [] },
      { name: 'In progress', tone: 'col-progress', cards: [{ title: 'Profile photo upload', note: 'Cloudinary signed URLs', priority: 'Low', progress: 40, assignees: 1, comments: 2 }] },
      { name: 'In review', tone: 'col-review', cards: [{ title: 'Design notification banner', note: 'Mobile push + in-app center', priority: 'Medium', progress: 88, assignees: 2, comments: 5 }] },
      { name: 'Done', tone: 'col-done', cards: [{ title: 'Kanban drag-and-drop', note: 'Optimistic UI + SignalR sync', priority: 'High', progress: 100, assignees: 3, comments: 7 }, { title: 'JWT authentication', note: 'Role-based guards shipped', priority: 'Low', progress: 100, assignees: 2, comments: 4 }] },
    ],
    [
      { name: 'To do', tone: 'col-todo', cards: [{ title: 'Sprint risk AI report', note: 'OpenAI + backlog context', priority: 'High', progress: 5, assignees: 2, comments: 0 }] },
      { name: 'In progress', tone: 'col-progress', cards: [{ title: 'Sprint velocity widget', note: 'Chart.js + dashboard API', priority: 'Medium', progress: 72, assignees: 1, comments: 3 }] },
      { name: 'In review', tone: 'col-review', cards: [{ title: 'Profile photo upload', note: 'Cloudinary signed URLs', priority: 'Low', progress: 95, assignees: 1, comments: 2 }] },
      { name: 'Done', tone: 'col-done', cards: [{ title: 'Design notification banner', note: 'Shipped to production', priority: 'Medium', progress: 100, assignees: 2, comments: 8 }] },
    ],
  ];

  ngOnInit(): void {
    this.themeService.setTheme('light');
    this.demoColumns.set(structuredClone(this.boardSnapshots[0]));
    this.demoInterval = setInterval(() => this.advanceDemoBoard(), 3800);
  }

  ngOnDestroy(): void {
    clearInterval(this.demoInterval);
    if (sessionStorage.getItem(LANDING_PREV_THEME_KEY) === 'dark') {
      sessionStorage.removeItem(LANDING_PREV_THEME_KEY);
      this.themeService.setTheme('dark');
    }
  }

  navigateWithSplash(path: string, event: Event): void {
    event.preventDefault();
    this.splash.show();
    window.setTimeout(() => void this.router.navigate([path]), 80);
  }

  priorityClass(priority: KanbanCard['priority']): string {
    switch (priority) {
      case 'High':
        return 'priority-high';
      case 'Low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  }

  private advanceDemoBoard(): void {
    this.snapshotIndex = (this.snapshotIndex + 1) % this.boardSnapshots.length;
    this.boardTick.update((v) => v + 1);
    this.livePulse.set(true);
    this.demoColumns.set(structuredClone(this.boardSnapshots[this.snapshotIndex]));
    window.setTimeout(() => this.livePulse.set(false), 700);
  }
}
