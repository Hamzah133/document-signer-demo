import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SavedRecipient {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SavedRecipientsService {
  private savedRecipients$ = new BehaviorSubject<SavedRecipient[]>([]);

  constructor() {
    this.loadSavedRecipients();
  }

  private loadSavedRecipients() {
    const saved = localStorage.getItem('savedRecipients');
    if (saved) {
      try {
        this.savedRecipients$.next(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved recipients', e);
      }
    }
  }

  getSavedRecipients(): SavedRecipient[] {
    return this.savedRecipients$.value;
  }

  addSavedRecipient(name: string, email: string): SavedRecipient {
    const recipient: SavedRecipient = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      createdAt: new Date()
    };

    const current = this.savedRecipients$.value;
    current.push(recipient);
    this.savedRecipients$.next(current);
    this.persistToLocalStorage();
    return recipient;
  }

  removeSavedRecipient(id: string) {
    const current = this.savedRecipients$.value;
    const filtered = current.filter(r => r.id !== id);
    this.savedRecipients$.next(filtered);
    this.persistToLocalStorage();
  }

  private persistToLocalStorage() {
    localStorage.setItem('savedRecipients', JSON.stringify(this.savedRecipients$.value));
  }
}
