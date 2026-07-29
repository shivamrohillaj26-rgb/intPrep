import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Interval, IntervalStream, lengthOfLongestSubstring } from './interview-utils/algorithms';
import { debounce } from './interview-utils/debounce';
import { deepClone } from './interview-utils/deep-clone';
import { TaskScheduler } from './interview-utils/task-scheduler';
import { AutocompleteTrie } from './interview-utils/trie';

type CloneDemoUser = {
  name: string;
  createdAt: Date;
  skills: string[];
  self?: CloneDemoUser;
};

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  readonly allItems = Array.from({ length: 10000 }, (_, index) => `Interview item ${index + 1}`);
  readonly pageSize = 12;
  readonly slides = ['Debounce', 'Virtual Scroll', 'Deep Clone', 'Trie Autocomplete'];

  searchQuery = '';
  searchResults: string[] = [];
  apiCallLog: string[] = [];

  visibleItems: string[] = [];
  private nextItemIndex = 0;

  longestInput = 'pwwkew';

  cloneSummary = '';

  schedulerStatus = 'No task scheduled yet.';
  private schedulerTaskId: number | null = null;
  private readonly scheduler = new TaskScheduler();

  editorText = '';
  saveStatus = 'Nothing to save yet.';
  private isDirty = false;
  private lastEditedAt = 0;
  private readonly autosaveIntervalId = setInterval(() => this.flushIfInactive(), 1000);

  intervalStart = 1;
  intervalEnd = 3;
  mergedIntervals: Interval[] = [];
  private readonly intervalStream = new IntervalStream();

  activeSlideIndex = 0;

  autocompletePrefix = 'an';
  suggestions: string[] = [];
  private readonly trie = new AutocompleteTrie();

  private readonly words = [
    'angular',
    'angular',
    'animation',
    'api',
    'array',
    'autocomplete',
    'browser',
    'change detection',
    'component',
    'directive',
    'rxjs',
  ];

  private readonly debouncedSearch = debounce((query: string) => this.performSearch(query), 300);
  private readonly debouncedSave = debounce(() => this.saveDraft('debounce'), 5000);

  constructor() {
    this.loadMoreItems();
    this.runCloneDemo();
    this.words.forEach((word) => this.trie.insert(word));
    this.updateSuggestions();
  }

  get longestAnswer(): number {
    return lengthOfLongestSubstring(this.longestInput);
  }

  get activeSlide(): string {
    return this.slides[this.activeSlideIndex];
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.debouncedSearch(query);
  }

  loadMoreItems(): void {
    const nextItems = this.allItems.slice(this.nextItemIndex, this.nextItemIndex + this.pageSize);
    this.visibleItems = [...this.visibleItems, ...nextItems];
    this.nextItemIndex += nextItems.length;
  }

  runCloneDemo(): void {
    const user: CloneDemoUser = {
      name: 'Shivam',
      createdAt: new Date('2026-07-17T00:00:00'),
      skills: ['Angular', 'JavaScript'],
    };
    user.self = user;

    const cloned = deepClone(user);

    this.cloneSummary = [
      `Object copied: ${cloned !== user}`,
      `Date copied: ${cloned.createdAt !== user.createdAt}`,
      `Cycle preserved: ${cloned.self === cloned}`,
      `Nested array copied: ${cloned.skills !== user.skills}`,
    ].join(' | ');
  }

  scheduleTask(): void {
    if (this.schedulerTaskId !== null) {
      this.scheduler.cancel(this.schedulerTaskId);
    }

    this.schedulerStatus = 'Task scheduled for 5 seconds.';
    this.schedulerTaskId = this.scheduler.schedule(() => {
      this.schedulerStatus = 'Task executed.';
      this.schedulerTaskId = null;
    }, 5000);
  }

  pauseTask(): void {
    if (this.schedulerTaskId !== null && this.scheduler.pause(this.schedulerTaskId)) {
      this.schedulerStatus = 'Task paused.';
    }
  }

  resumeTask(): void {
    if (this.schedulerTaskId !== null && this.scheduler.resume(this.schedulerTaskId)) {
      this.schedulerStatus = 'Task resumed.';
    }
  }

  cancelTask(): void {
    if (this.schedulerTaskId !== null && this.scheduler.cancel(this.schedulerTaskId)) {
      this.schedulerStatus = 'Task canceled.';
      this.schedulerTaskId = null;
    }
  }

  onEditorChange(value: string): void {
    this.editorText = value;
    this.isDirty = true;
    this.lastEditedAt = Date.now();
    this.saveStatus = 'Unsaved changes. Waiting for 5 seconds of inactivity.';
    this.debouncedSave();
  }

  addInterval(): void {
    this.mergedIntervals = this.intervalStream.add([this.intervalStart, this.intervalEnd]);
  }

  clearIntervals(): void {
    this.intervalStream.clear();
    this.mergedIntervals = [];
  }

  previousSlide(): void {
    this.activeSlideIndex = (this.activeSlideIndex - 1 + this.slides.length) % this.slides.length;
  }

  nextSlide(): void {
    this.activeSlideIndex = (this.activeSlideIndex + 1) % this.slides.length;
  }

  updateSuggestions(): void {
    this.suggestions = this.trie.search(this.autocompletePrefix, 5);
  }

  ngOnDestroy(): void {
    this.debouncedSearch.cancel();
    this.debouncedSave.cancel();
    this.scheduler.clearAll();
    clearInterval(this.autosaveIntervalId);
  }

  private performSearch(query: string): void {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      this.searchResults = [];
      return;
    }

    this.searchResults = this.words.filter((word) => word.includes(normalized)).slice(0, 5);
    this.apiCallLog = [`API call for "${normalized}"`, ...this.apiCallLog].slice(0, 5);
  }

  private flushIfInactive(): void {
    if (!this.isDirty) {
      return;
    }

    const inactiveFor = Date.now() - this.lastEditedAt;
    if (inactiveFor >= 5000) {
      this.saveDraft('interval safety check');
    }
  }

  private saveDraft(source: 'debounce' | 'interval safety check'): void {
    if (!this.isDirty) {
      return;
    }

    this.isDirty = false;
    this.saveStatus = `Saved by ${source} at ${new Date().toLocaleTimeString()}.`;
  }
}
