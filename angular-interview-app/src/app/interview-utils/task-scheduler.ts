type TaskStatus = 'scheduled' | 'paused';

type ScheduledTask = {
  callback: () => void;
  remaining: number;
  startedAt: number;
  timerId: ReturnType<typeof setTimeout>;
  status: TaskStatus;
};

export class TaskScheduler {
  private readonly tasks = new Map<number, ScheduledTask>();
  private nextId = 1;

  schedule(callback: () => void, delay: number): number {
    const id = this.nextId++;
    const task: ScheduledTask = {
      callback,
      remaining: delay,
      startedAt: Date.now(),
      timerId: setTimeout(() => this.run(id), delay),
      status: 'scheduled',
    };

    this.tasks.set(id, task);
    return id;
  }

  pause(id: number): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'scheduled') {
      return false;
    }

    clearTimeout(task.timerId);
    task.remaining = Math.max(0, task.remaining - (Date.now() - task.startedAt));
    task.status = 'paused';
    return true;
  }

  resume(id: number): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status !== 'paused') {
      return false;
    }

    task.startedAt = Date.now();
    task.status = 'scheduled';
    task.timerId = setTimeout(() => this.run(id), task.remaining);
    return true;
  }

  cancel(id: number): boolean {
    const task = this.tasks.get(id);
    if (!task) {
      return false;
    }

    clearTimeout(task.timerId);
    this.tasks.delete(id);
    return true;
  }

  clearAll(): void {
    for (const task of this.tasks.values()) {
      clearTimeout(task.timerId);
    }
    this.tasks.clear();
  }

  private run(id: number): void {
    const task = this.tasks.get(id);
    if (!task) {
      return;
    }

    this.tasks.delete(id);
    task.callback();
  }
}
