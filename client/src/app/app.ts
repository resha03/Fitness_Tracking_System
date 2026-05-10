import { Component, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

interface User {
  name: string;
  email: string;
  weight: number;
  height: number;
  age: number;
  goal: string;
  role?: 'admin' | 'user';
}

interface Workout {
  id: number;
  name: string;
  category: string;
  duration: number;
  notes: string;
}

interface MetricCard {
  label: string;
  value: string;
  detail: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly apiUrl = 'http://localhost:5000/api';

  authMode = signal<'login' | 'register'>('login');
  authenticated = signal(false);
  activeUser = signal<User | null>(null);
  authError = signal('');
  workoutError = signal('');
  userEmail = signal('');
  section = signal<
    'dashboard' | 'workouts' | 'addWorkout' | 'workoutDetails' | 'progress' | 'profile' | 'settings'
  >('dashboard');
  // UI state
  showWorkoutForm = signal(false);
  viewingWorkout = signal<Workout | null>(null);
  mobileNavOpen = signal(false);

  metrics = signal<MetricCard[]>([
    { label: 'Heart Rate', value: '98 bpm', detail: 'Resting' },
    { label: 'Steps', value: '2,419', detail: 'Goal 6,000' },
    { label: 'Calories', value: '1,196 kcal', detail: 'Goal 3,000' },
    { label: 'Sleep', value: '7h 24m', detail: 'Goal 8h' }
  ]);

  journals = signal([
    { title: 'Morning Walk', note: 'Short brisk walk before breakfast.', time: '7:00 AM' },
    { title: 'Hydration Check', note: 'Drank 2 cups of water.', time: '8:15 AM' },
    { title: 'Healthy Breakfast', note: 'Oatmeal, fruit, and green tea.', time: '9:00 AM' }
  ]);

  workouts = signal<Workout[]>([]);

  loginForm = {
    email: signal(''),
    password: signal('')
  };

  registerForm = {
    name: signal(''),
    email: signal(''),
    password: signal(''),
    confirmPassword: signal(''),
    weight: signal(75),
    height: signal(175),
    age: signal(25),
    goal: signal('Maintain weight'),
    role: signal<'admin' | 'user'>('user')
  };

  workoutForm = {
    name: signal(''),
    category: signal('Cardio'),
    duration: signal(30),
    notes: signal('')
  };

  // UI helpers for workouts search & pagination
  workoutSearch = signal('');
  currentPage = signal(1);
  pageSize = 10;
  workoutCategory = signal('');


  editId = signal<number | null>(null);

  isAdmin(): boolean {
    return this.activeUser()?.role === 'admin';
  }

  get isLogin(): boolean {
    return this.authMode() === 'login';
  }

  get profileName(): string {
    return this.activeUser()?.name ?? 'User';
  }

  get profileDescription(): string {
    const user = this.activeUser();
    return user ? `${user.weight} kg · ${user.height} cm · ${user.age} yrs` : 'Fitness Overview';
  }

  get recentWorkouts(): Workout[] {
    return [...this.workouts()].slice(-3).reverse();
  }

  get editing(): boolean {
    return this.editId() !== null;
  }

  switchMode(mode: 'login' | 'register'): void {
    this.authMode.set(mode);
    this.authError.set('');
  }

  async login(): Promise<void> {
    this.authError.set('');
    const email = this.loginForm.email().trim();
    const password = this.loginForm.password();

    if (!email || !password) {
      this.authError.set('Email and password are required.');
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const payload = await response.json();

      if (!response.ok) {
        this.authError.set(payload.message || 'Login failed.');
        return;
      }

      this.activeUser.set(payload.user);
      this.userEmail.set(payload.user.email);
      this.authenticated.set(true);
      this.section.set('dashboard');
      await this.fetchWorkouts();
      this.clearAuthForms();
    } catch (error) {
      this.authError.set('Could not reach the server.');
    }
  }

  async register(): Promise<void> {
    this.authError.set('');
    const name = this.registerForm.name().trim();
    const email = this.registerForm.email().trim();
    const password = this.registerForm.password();
    const confirmPassword = this.registerForm.confirmPassword();

    if (!name || !email || !password || !confirmPassword) {
      this.authError.set('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      this.authError.set('Passwords do not match.');
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          weight: this.registerForm.weight(),
          height: this.registerForm.height(),
          age: this.registerForm.age(),
          goal: this.registerForm.goal(),
          role: this.registerForm.role()
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        this.authError.set(payload.message || 'Registration failed.');
        return;
      }

      // After successful registration, send user back to login.
      this.clearAuthForms();
      this.authMode.set('login');
      this.authError.set('Registration successful — please log in.');
    } catch (error) {
      this.authError.set('Could not reach the server.');
    }
  }

  // Server-driven search/pagination
  total = signal(0);
  totalPages = signal(1);

  get paginatedWorkouts(): Workout[] {
    // workouts already comes paginated from backend
    return this.workouts();
  }

  setPage(n: number): void {
    const max = this.totalPages();
    if (n < 1) n = 1;
    if (n > max) n = max;
    this.currentPage.set(n);
    void this.fetchWorkouts();
  }


  async uploadProfileFile(file: File | null): Promise<void> {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('email', this.userEmail());

      const res = await fetch(`${this.apiUrl}/upload`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        this.authError.set(data.message || 'Upload failed.');
        return;
      }

      this.authError.set('');
      if (data.user) this.activeUser.set(data.user);
    } catch {
      this.authError.set('Could not reach the server.');
    }
  }


  async fetchWorkouts(): Promise<void> {
    this.workoutError.set('');
    const email = this.userEmail();

    if (!email) return;

    try {
      const q = this.workoutSearch().trim();
      const category = this.workoutCategory().trim();
      const page = this.currentPage();
      const pageSize = this.pageSize;

      const params = new URLSearchParams();
      params.set('email', email);
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const response = await fetch(`${this.apiUrl}/workouts?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        this.workoutError.set(payload.message || 'Unable to load workouts.');
        return;
      }

      this.workouts.set(payload.workouts || []);
      this.total.set(payload.total || 0);
      this.totalPages.set(payload.totalPages || 1);
    } catch (error) {
      this.workoutError.set('Could not reach the server.');
    }
  }


  async saveWorkout(): Promise<void> {
    this.workoutError.set('');
    const name = this.workoutForm.name().trim();
    const category = this.workoutForm.category().trim();
    const duration = Number(this.workoutForm.duration());
    const notes = this.workoutForm.notes().trim();
    const email = this.userEmail();

    if (!name || !category || !duration) {
      this.workoutError.set('Name, category, and duration are required.');
      return;
    }

    const payload = { email, name, category, duration, notes };

    try {
      if (this.editing) {
        const response = await fetch(`${this.apiUrl}/workouts/${this.editId()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
          this.workoutError.set(data.message || 'Unable to update workout.');
          return;
        }

        this.workouts.update((current) => current.map((item) => (item.id === data.workout.id ? data.workout : item)));
      } else {
        const response = await fetch(`${this.apiUrl}/workouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
          this.workoutError.set(data.message || 'Unable to save workout.');
          return;
        }

        this.workouts.update((current) => [...current, data.workout]);
      }

      this.cancelEdit();
    } catch (error) {
      this.workoutError.set('Could not reach the server.');
    }
  }

  editWorkout(workout: Workout): void {
    this.editId.set(workout.id);
    this.workoutForm.name.set(workout.name);
    this.workoutForm.category.set(workout.category);
    this.workoutForm.duration.set(workout.duration);
    this.workoutForm.notes.set(workout.notes);
    this.showWorkoutForm.set(true);
  }

  openAddWorkout(): void {
    this.resetForm();
    this.editId.set(null);
    this.showWorkoutForm.set(true);
    this.section.set('addWorkout');
  }

  closeWorkoutForm(): void {
    this.showWorkoutForm.set(false);
    this.cancelEdit();
    this.section.set('workouts');
  }

  openWorkoutDetails(workout: Workout): void {
    this.viewingWorkout.set(workout);
    this.section.set('workoutDetails');
  }

  closeWorkoutDetails(): void {
    this.viewingWorkout.set(null);
    this.section.set('workouts');
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update(v => !v);
  }

  async deleteWorkout(id: number): Promise<void> {
    this.workoutError.set('');
    const email = this.userEmail();

    try {
      const response = await fetch(`${this.apiUrl}/workouts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = await response.json();
        this.workoutError.set(data.message || 'Unable to delete workout.');
        return;
      }

      this.workouts.update((current) => current.filter((item) => item.id !== id));
      if (this.editId() === id) {
        this.cancelEdit();
      }
    } catch (error) {
      this.workoutError.set('Could not reach the server.');
    }
  }

  cancelEdit(): void {
    this.editId.set(null);
    this.resetForm();
  }

  logout(): void {
    this.authenticated.set(false);
    this.activeUser.set(null);
    this.userEmail.set('');
    this.workouts.set([]);
    this.section.set('dashboard');
    this.clearAuthForms();
  }

  goSettings(): void {
    this.section.set('settings');
  }

  closeSettings(): void {
    this.section.set('profile');
  }

  resetForm(): void {
    this.workoutForm.name.set('');
    this.workoutForm.category.set('Cardio');
    this.workoutForm.duration.set(30);
    this.workoutForm.notes.set('');
  }

  clearAuthForms(): void {
    this.loginForm.email.set('');
    this.loginForm.password.set('');
    this.registerForm.name.set('');
    this.registerForm.email.set('');
    this.registerForm.password.set('');
    this.registerForm.confirmPassword.set('');
    this.registerForm.weight.set(75);
    this.registerForm.height.set(175);
    this.registerForm.age.set(25);
    this.registerForm.goal.set('Maintain weight');
    this.authError.set('');
  }
}
